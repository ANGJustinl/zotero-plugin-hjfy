import { getString } from "../utils/locale";

export class ArxivTranslationFactory {
  /**
   * 注册右键菜单项
   */
  static registerRightClickMenuItem() {
    const menuIcon = `chrome://${addon.data.config.addonRef}/content/icons/favicon@0.5x.png`;
    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: "zotero-itemmenu-hjfy-arxiv-translate",
      label: getString("menuitem-label"),
      commandListener: (ev) => {
        const items = ztoolkit.getGlobal("ZoteroPane").getSelectedItems();
        if (items.length > 0) {
          this.translateSelectedItems(items);
        }
      },
      icon: menuIcon,
    });
  }

  /**
   * 翻译选中的条目
   */
  static async translateSelectedItems(items: Zotero.Item[]) {
    const progressWindow = new ztoolkit.ProgressWindow(getString("menuitem-label"));
    const progressLines: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const progressLine = progressWindow.createLine({
        text: `正在处理: ${item.getDisplayTitle()}`,
        type: "default",
        progress: 0,
      });
      progressLines.push(progressLine);

      try {
        await this.translateSingleItem(item, progressLine);
        // 更新进度行
        progressWindow.createLine({
          text: `✅ ${item.getDisplayTitle()}`,
          type: "success",
          progress: 100,
        });
      } catch (error) {
        ztoolkit.log(`翻译失败: ${item.getDisplayTitle()}`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        progressWindow.createLine({
          text: `❌ ${item.getDisplayTitle()}: ${errorMessage}`,
          type: "error",
          progress: 100,
        });
      }
    }

    progressWindow.show();
    progressWindow.startCloseTimer(5000);
  }

  /**
   * 翻译单个条目
   */
  static async translateSingleItem(item: Zotero.Item, progressLine: any) {
    // 1. 读取 DOI
    ztoolkit.log("📖 读取 DOI...");
    const doi = this.extractDOI(item);
    if (!doi) {
      throw new Error("未找到有效的 DOI");
    }

    // 2. 提取 arXiv ID
    ztoolkit.log("🔍 解析 arXiv ID...");
    const arxivId = this.extractArxivId(doi);
    if (!arxivId) {
      throw new Error("无法从 DOI 中提取 arXiv ID");
    }

    // 3. 下载翻译后的 PDF
    ztoolkit.log("⬇️ 下载翻译 PDF...");
    const pdfBuffer = await this.downloadTranslatedPdf(arxivId);

    // 4. 保存 PDF 并添加附件
    ztoolkit.log("📎 添加附件...");
    const attachment = await this.savePdfAsAttachment(item, pdfBuffer, arxivId);

    ztoolkit.log("✅ 完成!");
    return attachment;
  }

  /**
   * 从条目中提取 DOI
   */
  static extractDOI(item: Zotero.Item): string | null {
    // 尝试从 DOI 字段获取
    let doi = item.getField("DOI") as string;

    // 如果 DOI 字段为空，尝试从 URL 字段解析
    if (!doi) {
      const url = item.getField("url") as string;
      if (url && url.includes("doi.org/")) {
        doi = url.split("doi.org/")[1];
      }
    }

    // 如果仍然为空，尝试从 extra 字段解析
    if (!doi) {
      const extra = item.getField("extra") as string;
      if (extra) {
        const doiMatch = extra.match(/DOI:\s*(10\.\d+\/[^\s]+)/i);
        if (doiMatch) {
          doi = doiMatch[1];
        }
      }
    }

    return doi ? doi.trim() : null;
  }

  /**
   * 从 DOI 中提取 arXiv ID
   */
  static extractArxivId(doi: string): string | null {
    // 匹配 arXiv DOI 格式: 10.48550/arxiv.2410.07087
    const arxivMatch = doi.match(/10\.48550\/arxiv\.(\d+\.\d+)/);
    if (arxivMatch) {
      return arxivMatch[1];
    }

    // 尝试其他可能的 arXiv DOI 格式
    const alternativeMatch = doi.match(/arxiv\.(\d+\.\d+)/i);
    if (alternativeMatch) {
      return alternativeMatch[1];
    }

    return null;
  }

  /**
   * 下载翻译后的 PDF
   */
  static async downloadTranslatedPdf(arxivId: string): Promise<ArrayBuffer> {
    const url = `https://hjfy.top/arxiv/${arxivId}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("响应体为空");
      }

      // 将响应流转换为 ArrayBuffer
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalLength = 0;

      while (true) {
        const result = await reader.read(new Uint8Array(1024));
        const { done, value } = result;
        if (done) break;

        if (value) {
          chunks.push(value);
          totalLength += value.length;
        }
      }

      // 合并所有 chunks
      const mergedResult = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        mergedResult.set(chunk, offset);
        offset += chunk.length;
      }

      return mergedResult.buffer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`下载失败: ${errorMessage}`);
    }
  }

  /**
   * 保存 PDF 并添加为附件
   */
  static async savePdfAsAttachment(
    item: Zotero.Item,
    pdfBuffer: ArrayBuffer,
    arxivId: string
  ): Promise<Zotero.Item> {
    // 生成文件名
    const title = item.getDisplayTitle().replace(/[^\w\s.-]/g, '').substring(0, 50);
    const filename = `${title}_hjfy_arxiv_${arxivId}.pdf`;

    // 创建临时文件路径
    const tempDir = Zotero.getTempDirectory().path + "/hjfy-arxiv";
    const tempPath = tempDir + "/" + filename;

    try {
      // 确保 tempDir 存在
      const tempDirFile = ztoolkit.getGlobal("FileUtils").File(tempDir);
      if (!tempDirFile.exists()) {
        tempDirFile.create(ztoolkit.getGlobal("Components.interfaces").nsIFile.DIRECTORY_TYPE, 0o755);
      }

      // 保存 PDF 到临时文件
      const file = ztoolkit.getGlobal("FileUtils").File(tempPath);
      const outputStream = ztoolkit.getGlobal("Components.classes")["@mozilla.org/network/file-output-stream;1"]
        .createInstance(ztoolkit.getGlobal("Components.interfaces").nsIFileOutputStream);
      outputStream.init(file, 0x02 | 0x08 | 0x20, 0o666, 0);
      outputStream.write(new Uint8Array(pdfBuffer));
      outputStream.close();

      // 将文件添加为 Zotero 附件
      const attachment = await Zotero.Attachments.importFromFile({
        file: file.path,
        parentItemID: item.id,
      });

      // 设置附件标题
      attachment.setField("title", `中文翻译 - ${item.getDisplayTitle()}`);
      await attachment.saveTx();

      return attachment;
    } finally {
      // 清理临时文件
      try {
        const file = ztoolkit.getGlobal("FileUtils").File(tempPath);
        if (file.exists()) {
          file.remove(false);
        }
      } catch (e) {
        ztoolkit.log("清理临时文件失败", e);
      }
    }
  }

  /**
   * 检查条目是否包含 arXiv DOI
   */
  static hasArxivDOI(item: Zotero.Item): boolean {
    const doi = this.extractDOI(item);
    return doi ? this.extractArxivId(doi) !== null : false;
  }

  /**
   * 批量翻译功能
   */
  static async batchTranslate() {
    const items = ztoolkit.getGlobal("ZoteroPane").getSelectedItems();
    const arxivItems = items.filter((item: Zotero.Item) => this.hasArxivDOI(item));

    if (arxivItems.length === 0) {
      new ztoolkit.ProgressWindow(getString("menuitem-label"))
        .createLine({
          text: "未找到包含 arXiv DOI 的条目",
          type: "warning",
        })
        .show();
      return;
    }

    await this.translateSelectedItems(arxivItems);
  }
}