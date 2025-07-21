// Simple test to verify markdown shortcuts are working
// This can be run in the browser console

console.log('Testing Markdown Shortcuts Extension...');

// Test if the extension is loaded
const checkExtension = () => {
  const editor = document.querySelector('.ProseMirror');
  if (editor) {
    console.log('✅ Editor found');
    
    // Test heading shortcuts
    console.log('Testing heading shortcuts...');
    console.log('Try typing: # Hello World');
    console.log('Try typing: ## Subheading');
    console.log('Try typing: ### Sub-subheading');
    
    // Test list shortcuts
    console.log('Testing list shortcuts...');
    console.log('Try typing: - List item');
    console.log('Try typing: * Another list item');
    console.log('Try typing: + Plus list item');
    console.log('Try typing: 1. Numbered item');
    
    // Test task list shortcuts
    console.log('Testing task list shortcuts...');
    console.log('Try typing: - [ ] Unchecked task');
    console.log('Try typing: - [x] Checked task');
    
    // Test code block shortcuts
    console.log('Testing code block shortcuts...');
    console.log('Try typing: ``` javascript');
    
    // Test blockquote shortcuts
    console.log('Testing blockquote shortcuts...');
    console.log('Try typing: > This is a quote');
    
    return true;
  } else {
    console.log('❌ Editor not found');
    return false;
  }
};

// Run the check
setTimeout(checkExtension, 1000);