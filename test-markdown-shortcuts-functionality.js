// Test script to verify markdown shortcuts are working
// Run this in the browser console when a note is open

console.log('🧪 Testing Markdown Shortcuts Extension...');

const testMarkdownShortcuts = () => {
  // Find the editor
  const editor = document.querySelector('.ProseMirror');
  if (!editor) {
    console.log('❌ Editor not found');
    return false;
  }

  console.log('✅ Editor found');
  
  // Focus the editor
  editor.focus();
  
  // Test function to simulate typing
  const simulateTyping = (text) => {
    const event = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: text,
      bubbles: true,
      cancelable: true
    });
    editor.dispatchEvent(event);
  };

  // Test heading shortcuts
  console.log('\n📝 Testing heading shortcuts...');
  console.log('Manual test: Type "# " followed by text');
  console.log('Manual test: Type "## " followed by text');
  console.log('Manual test: Type "### " followed by text');

  // Test list shortcuts
  console.log('\n📋 Testing list shortcuts...');
  console.log('Manual test: Type "- " followed by text');
  console.log('Manual test: Type "* " followed by text');
  console.log('Manual test: Type "+ " followed by text');
  console.log('Manual test: Type "1. " followed by text');

  // Test task list shortcuts
  console.log('\n☑️ Testing task list shortcuts...');
  console.log('Manual test: Type "- [ ] " followed by text');
  console.log('Manual test: Type "- [x] " followed by text');

  // Test code block shortcuts
  console.log('\n💻 Testing code block shortcuts...');
  console.log('Manual test: Type "``` " (three backticks and space)');
  console.log('Manual test: Type "```javascript " for language-specific block');

  // Test blockquote shortcuts
  console.log('\n💬 Testing blockquote shortcuts...');
  console.log('Manual test: Type "> " followed by text');

  console.log('\n✨ All tests ready! Try the manual tests above in the editor.');
  
  return true;
};

// Run the test
testMarkdownShortcuts();