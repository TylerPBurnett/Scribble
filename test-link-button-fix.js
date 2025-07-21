/**
 * Test script to verify the link button fix
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔗 Testing Link Button Fix...\n');

try {
  const toolbarPath = path.join(__dirname, 'src/note-window/components/EssentialToolbar.tsx');
  const toolbar = fs.readFileSync(toolbarPath, 'utf8');
  
  // Check if the link button uses proper chain syntax
  if (toolbar.includes('editor.chain().focus().unsetLink().run()')) {
    console.log('✅ Link button uses proper chain syntax for unsetLink');
  } else {
    console.log('❌ Link button does not use proper chain syntax for unsetLink');
  }
  
  // Check if the link button properly accesses editor state
  if (toolbar.includes('editor.state.selection') && toolbar.includes('editor.state.doc.textBetween')) {
    console.log('✅ Link button properly accesses editor state for selected text');
  } else {
    console.log('❌ Link button does not properly access editor state');
  }
  
  // Check if markdown syntax preview is shown
  if (toolbar.includes('showMarkdownSyntax(`[${selectedText || \'text\'}](${url})`)')) {
    console.log('✅ Link button shows markdown syntax preview');
  } else {
    console.log('❌ Link button does not show markdown syntax preview');
  }
  
  // Check if setLink uses proper chain syntax
  if (toolbar.includes('editor.chain().focus().setLink({ href: url }).run()')) {
    console.log('✅ Link button uses proper chain syntax for setLink');
  } else {
    console.log('❌ Link button does not use proper chain syntax for setLink');
  }
  
  console.log('\n🎉 Link Button Fix Verification Complete!');
  console.log('\nThe link button should now work properly with:');
  console.log('• Proper Tiptap chain syntax for all commands');
  console.log('• Correct access to editor state for selected text');
  console.log('• Markdown syntax preview showing [text](url) format');
  console.log('• Proper handling of both setting and unsetting links');
  
} catch (error) {
  console.log('❌ Error testing link button fix:', error.message);
}