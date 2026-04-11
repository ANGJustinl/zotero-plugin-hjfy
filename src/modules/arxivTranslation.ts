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
      commandListener: () => {
        const items = ztoolkit.getGlobal("ZoteroPane").getSelectedItems();
        if (items.length > 0) {
          this.translateSelectedItems(items);
        } else {
          new ztoolkit.ProgressWindow(getString("menuitem-label"))
            .createLine({
              text: "未选择任何条目",
              type: "warning",
            })
            .show()
            .startCloseTimer(3000);
        }
      },
      icon: menuIcon,
    });
  }

  /**
   * 翻译选中的条目
   */
  static async translateSelectedItems(items: Zotero.Item[]) {
    const progressWindow = new ztoolkit.ProgressWindow(
      getString("menuitem-label"),
    );
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
        const errorMessage =
          error instanceof Error ? error.message : String(error);
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
  static async translateSingleItem(item: Zotero.Item, _progressLine: any) {
    // 1. 读取 DOI
    ztoolkit.log("正在读取 DOI...");
    const doi = this.extractDOI(item);
    if (!doi) {
      throw new Error("未找到有效的 DOI");
    }

    // 2. 提取 arXiv ID
    ztoolkit.log("正在解析 arXiv ID...");
    const arxivId = this.extractArxivId(doi);
    if (!arxivId) {
      throw new Error("无法从 DOI 中提取 arXiv ID");
    }

    const expectedAttachmentFilename = this.getTranslationAttachmentFilename(
      item,
      arxivId,
    );
    const existingAttachment = this.findExistingTranslationAttachment(
      item,
      expectedAttachmentFilename,
    );
    if (existingAttachment) {
      ztoolkit.log("翻译附件已存在，跳过下载", expectedAttachmentFilename);
      return existingAttachment;
    }

    // 3. 获取文件信息并下载翻译后的 PDF
    ztoolkit.log("正在获取文件信息...");
    const fileInfo = await this.fetchArxivFileInfo(arxivId);

    // 优先使用中文翻译 PDF
    const downloadUrl = fileInfo.zhCN || fileInfo.origin;
    if (!downloadUrl) {
      throw new Error("未找到可用的下载链接");
    }

    ztoolkit.log("正在下载 PDF...");
    const pdfBuffer = await this.downloadPdf(downloadUrl);

    // 4. 保存 PDF 并添加附件
    ztoolkit.log("正在添加附件...");
    const attachment = await this.savePdfAsAttachment(item, pdfBuffer, arxivId);

    ztoolkit.log("翻译完成!");
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
   * 获取请求头（标注来源）
   */
  static getRequestHeaders(): HeadersInit {
    return {
      "User-Agent": `zotero-plugin-hjfy (Zotero Plugin; +https://github.com/angjustinl/zotero-plugin-hjfy)`,
    };
  }

  /**
   * 从 hjfy.top API 获取 arXiv 文件信息
   */
  static async fetchArxivFileInfo(arxivId: string): Promise<{
    id: string;
    title: string;
    origin: string;
    zhCN?: string;
    zhCNTar?: string;
    isDeepSeek: boolean;
  }> {
    const apiUrl = `https://hjfy.top/api/arxivFiles/${arxivId}`;

    try {
      const response = await fetch(apiUrl, {
        headers: this.getRequestHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as unknown as {
        status: number;
        data: {
          id: string;
          title: string;
          origin: string;
          zhCN?: string;
          zhCNTar?: string;
          isDeepSeek: boolean;
        };
      };

      if (data.status !== 0) {
        throw new Error(`API 返回错误状态: ${data.status}`);
      }

      return data.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`获取文件信息失败: ${errorMessage}`);
    }
  }

  /**
   * 下载文件（支持原文或中文翻译）
   * @param fileUrl 文件 URL
   * @param useTranslation 是否使用中文翻译（默认 true）
   */
  static async downloadPdf(fileUrl: string): Promise<ArrayBuffer> {
    try {
      const response = await fetch(fileUrl, {
        headers: this.getRequestHeaders(),
      });
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
        const { done, value } = await reader.read(new Uint8Array(1024));
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`下载失败: ${errorMessage}`);
    }
  }

  /**
   * 保存 PDF 并添加为附件
   */
  static async savePdfAsAttachment(
    item: Zotero.Item,
    pdfBuffer: ArrayBuffer,
    arxivId: string,
  ): Promise<Zotero.Item> {
    const filename = this.getTranslationAttachmentFilename(item, arxivId);

    // 创建临时文件 - 使用 Zotero 的临时目录 API
    const tempDir = Zotero.getTempDirectory();
    tempDir.append("hjfy-arxiv");
    if (!tempDir.exists()) {
      tempDir.create(1, 0o755);
    }

    const tempFile = tempDir.clone();
    tempFile.append(filename);

    try {
      // 将 ArrayBuffer 写入临时文件
      await this.writeFile(tempFile, pdfBuffer);

      // 将文件添加为 Zotero 附件
      const attachment = await Zotero.Attachments.importFromFile({
        file: tempFile,
        parentItemID: item.id,
      });

      // 设置附件标题
      attachment.setField("title", `幻觉翻译 - ${item.getDisplayTitle()}`);
      await attachment.saveTx();

      return attachment;
    } finally {
      // 清理临时文件
      try {
        if (tempFile.exists()) {
          tempFile.remove(false);
        }
      } catch (e) {
        ztoolkit.log("清理临时文件失败", e);
      }
    }
  }

  /**
   * 获取翻译附件的文件名
   */
  static getTranslationAttachmentFilename(
    item: Zotero.Item,
    arxivId: string,
  ): string {
    const title = item
      .getDisplayTitle()
      .replace(/[^\w\s.-]/g, "")
      .substring(0, 50);
    return `${title}_hjfy_arxiv_${arxivId}.pdf`;
  }

  /**
   * 查找已存在的翻译附件
   */
  static findExistingTranslationAttachment(
    item: Zotero.Item,
    filename: string,
  ): Zotero.Item | null {
    const attachmentIDs = item.getAttachments();

    for (const attachmentID of attachmentIDs) {
      const attachment = Zotero.Items.get(attachmentID) as Zotero.Item | null;
      if (!attachment) {
        continue;
      }

      const existingFilename = attachment.getFilename();
      const fileExists =
        typeof (attachment as any).fileExists === "function"
          ? (attachment as any).fileExists()
          : false;

      if (existingFilename === filename && fileExists) {
        return attachment;
      }
    }

    return null;
  }

  /**
   * 将 ArrayBuffer 写入文件
   */
  static async writeFile(file: any, data: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const outputStream = (Components.classes as any)[
        "@mozilla.org/network/file-output-stream;1"
      ].createInstance(Components.interfaces.nsIFileOutputStream);
      outputStream.init(file, 0x02 | 0x08 | 0x20, 0o666, 0);

      try {
        const binaryStream = (Components.classes as any)[
          "@mozilla.org/binaryoutputstream;1"
        ].createInstance(Components.interfaces.nsIBinaryOutputStream);
        binaryStream.setOutputStream(outputStream);

        const bytes = new Uint8Array(data);
        binaryStream.writeByteArray(bytes, bytes.length);
        binaryStream.close();
        outputStream.close();

        resolve();
      } catch (e) {
        outputStream.close();
        reject(e);
      }
    });
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
    const arxivItems = items.filter((item: Zotero.Item) =>
      this.hasArxivDOI(item),
    );

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
