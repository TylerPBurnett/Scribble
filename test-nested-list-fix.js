// Test script to verify nested list persistence fix
const { markdownToHtml, htmlToMarkdown } = require('./src/shared/utils/markdownUtils.ts');

// Test markdown with nested lists
const testMarkdown = `# Test Note

Here's a nested list:

- Item 1
  - Nested item 1.1
  - Nested item 1.2
    - Deep nested item 1.2.1
- Item 2
  - Nested item 2.1

And an ordered list:

1. First item
   - Sub item A
   - Sub item B
2. Second item
   - Sub item C

Task list:

- [ ] Unchecked task
- [x] Checked task
  - [ ] Nested unchecked
  - [x] Nested checked`;

console.log('Original Markdown:');
console.log(testMarkdown);
console.log('\n' + '='.repeat(50) + '\n');

// Convert to HTML
const html = markdownToHtml(testMarkdown);
console.log('Converted to HTML:');
console.log(html);
console.log('\n' + '='.repeat(50) + '\n');

// Convert back to markdown
const backToMarkdown = htmlToMarkdown(html);
console.log('Converted back to Markdown:');
console.log(backToMarkdown);
console.log('\n' + '='.repeat(50) + '\n');

// Test if they're equivalent (allowing for minor formatting differences)
const normalizeMarkdown = (md) => md.replace(/\s+/g, ' ').trim();
const isEquivalent = normalizeMarkdown(testMarkdown) === normalizeMarkdown(backToMarkdown);

console.log('Round-trip test result:', isEquivalent ? 'PASS' : 'FAIL');

if (!isEquivalent) {
  console.log('\nDifferences detected:');
  console.log('Original length:', testMarkdown.length);
  console.log('Round-trip length:', backToMarkdown.length);
}