
const fs = require('fs');

function extractMarkdownHeadings(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const headingPattern = /^\s*#{1,6}\s+.*$/;
  const headings = lines.filter(line => headingPattern.test(line));
  return headings.map(line => line.trim());
}

function main() {
    const filePath = process.argv.slice(2)[0];
    if (!filePath) {
        console.error('Usage: node extractHeadings.js <file-path>');
        process.exit(1);
    }
    const headings = extractMarkdownHeadings(filePath);
    headings.forEach(heading => {
        const level = heading.match(/#/g).length;
        const text = heading.replace(/^#+\s*/, '');
        var level_text = "#".repeat(level);
        var body_text = text.replace(/#/g, "");
        console.log(`${level_text} ${body_text}`);
    });
}

main();
// node manuscript/enum_title.js manuscript/manuscript.md
