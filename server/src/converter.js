const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const pdf = require("pdf-parse");
const xlsx = require("xlsx");
const AdmZip = require("adm-zip");
const { parseStringPromise } = require("xml2js");
const TurndownService = require("turndown");

const turndownService = new TurndownService();

async function convertToMarkdown(filePath, originalFilename) {
  const ext = path.extname(originalFilename).toLowerCase();

  try {
    if (ext === ".md" || ext === ".txt") {
      return fs.readFileSync(filePath, "utf8");
    } else if (ext === ".docx") {
      const result = await mammoth.convertToHtml({ path: filePath });
      return turndownService.turndown(result.value);
    } else if (ext === ".pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } else if (ext === ".xlsx" || ext === ".xls") {
      const workbook = xlsx.readFile(filePath);
      let markdown = "";
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const csv = xlsx.utils.sheet_to_csv(sheet);
        if (csv.trim().length > 0) {
          markdown += `## Sheet: ${sheetName}\n\n`;
          markdown += csvToMarkdown(csv);
          markdown += "\n\n";
        }
      });
      return markdown;
    } else if (ext === ".pptx") {
      return await extractTextFromPPTX(filePath);
    } else {
      // Fallback: Try reading as text
      try {
        return fs.readFileSync(filePath, "utf8");
      } catch (e) {
        return `Error: Unsupported file format ${ext}`;
      }
    }
  } catch (error) {
    console.error(`Error converting ${ext}:`, error);
    throw new Error(`Failed to convert ${originalFilename}: ${error.message}`);
  }
}

function csvToMarkdown(csv) {
  const lines = csv.split("\n");
  if (lines.length === 0) return "";

  let md = "";
  lines.forEach((line, index) => {
    // Handle quotes in CSV? Simple split for now.
    const columns = line.split(",").map((c) => c.trim());
    const row = "| " + columns.join(" | ") + " |";
    md += row + "\n";
    if (index === 0) {
      const separator = "| " + columns.map(() => "---").join(" | ") + " |";
      md += separator + "\n";
    }
  });
  return md;
}

async function extractTextFromPPTX(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const slideFiles = zip
      .getEntries()
      .filter((entry) => entry.entryName.match(/ppt\/slides\/slide\d+\.xml/));

    // Sort slides by number
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)\.xml/)[1]);
      const numB = parseInt(b.entryName.match(/slide(\d+)\.xml/)[1]);
      return numA - numB;
    });

    let markdown = "";

    for (const slide of slideFiles) {
      const content = slide.getData().toString("utf8");
      const result = await parseStringPromise(content);

      const textParts = [];

      // Helper to recursively find text
      const findText = (node) => {
        if (typeof node === "object") {
          for (const key in node) {
            if (key === "a:t") {
              const text = node[key];
              if (Array.isArray(text)) textParts.push(text.join(" "));
              else textParts.push(text);
            } else {
              findText(node[key]);
            }
          }
        } else if (Array.isArray(node)) {
          node.forEach(findText);
        }
      };

      findText(result);

      if (textParts.length > 0) {
        markdown += `\n---\n\n# Slide\n\n${textParts.join("\n")}\n`;
      }
    }

    return markdown;
  } catch (e) {
    console.error("PPTX Error:", e);
    return "Error parsing PPTX";
  }
}

module.exports = { convertToMarkdown };
