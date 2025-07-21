// Simple test for nested list conversion
// We'll manually test the key functions

// Simulate the markdownToHtml function logic
function testMarkdownToHtml() {
  const testMarkdown = `- Item 1
  - Nested item 1.1
  - Nested item 1.2
- Item 2`;

  console.log('Test Markdown:');
  console.log(testMarkdown);
  
  // Test if our parsing logic would work
  const lines = testMarkdown.split('\n');
  console.log('\nParsed lines:');
  lines.forEach((line, i) => {
    const indent = line.match(/^(\s*)/)[1].length;
    const isListItem = /^\s*[-*+]\s/.test(line);
    console.log(`Line ${i}: indent=${indent}, isListItem=${isListItem}, content="${line}"`);
  });
}

testMarkdownToHtml();

console.log('\n' + '='.repeat(50));
console.log('The fix should handle nested lists by:');
console.log('1. Tracking indentation levels');
console.log('2. Building proper nested HTML structure');
console.log('3. Preserving nesting when converting back to markdown');