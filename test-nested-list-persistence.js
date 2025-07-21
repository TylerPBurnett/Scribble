/**
 * Test script to reproduce and debug nested list persistence issues
 * This will help us understand what's happening when notes are saved and reloaded
 */

// Test HTML content with nested lists
const testNestedListHTML = `
<ul>
  <li>
    <p>First level item 1</p>
    <ul>
      <li>
        <p>Second level item 1</p>
        <ul>
          <li>
            <p>Third level item 1</p>
          </li>
          <li>
            <p>Third level item 2</p>
          </li>
        </ul>
      </li>
      <li>
        <p>Second level item 2</p>
      </li>
    </ul>
  </li>
  <li>
    <p>First level item 2</p>
  </li>
</ul>
`;

const testOrderedNestedListHTML = `
<ol>
  <li>
    <p>First ordered item</p>
    <ol>
      <li>
        <p>Nested ordered item 1</p>
      </li>
      <li>
        <p>Nested ordered item 2</p>
        <ul>
          <li>
            <p>Mixed nested bullet item</p>
          </li>
        </ul>
      </li>
    </ol>
  </li>
  <li>
    <p>Second ordered item</p>
  </li>
</ol>
`;

const testTaskListHTML = `
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false">
    <label><input type="checkbox"><span></span></label>
    <div>
      <p>Task item 1</p>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="true">
          <label><input type="checkbox" checked><span></span></label>
          <div>
            <p>Nested completed task</p>
          </div>
        </li>
        <li data-type="taskItem" data-checked="false">
          <label><input type="checkbox"><span></span></label>
          <div>
            <p>Nested incomplete task</p>
          </div>
        </li>
      </ul>
    </div>
  </li>
  <li data-type="taskItem" data-checked="false">
    <label><input type="checkbox"><span></span></label>
    <div>
      <p>Task item 2</p>
    </div>
  </li>
</ul>
`;

console.log('=== NESTED LIST PERSISTENCE TEST ===');
console.log('');
console.log('Test HTML for bullet lists:');
console.log(testNestedListHTML);
console.log('');
console.log('Test HTML for ordered lists:');
console.log(testOrderedNestedListHTML);
console.log('');
console.log('Test HTML for task lists:');
console.log(testTaskListHTML);
console.log('');

// Function to simulate what happens during save/load cycle
function simulateSaveLoadCycle(html) {
  console.log('Original HTML:');
  console.log(html);
  
  // This is what would happen when content is saved
  const savedContent = html;
  
  // This is what would happen when content is loaded back
  // The issue might be in how Tiptap processes the HTML during setContent
  console.log('Content that would be saved:');
  console.log(savedContent);
  
  return savedContent;
}

console.log('=== SIMULATING SAVE/LOAD CYCLES ===');
console.log('');

console.log('1. Bullet List Save/Load:');
simulateSaveLoadCycle(testNestedListHTML);
console.log('');

console.log('2. Ordered List Save/Load:');
simulateSaveLoadCycle(testOrderedNestedListHTML);
console.log('');

console.log('3. Task List Save/Load:');
simulateSaveLoadCycle(testTaskListHTML);
console.log('');

console.log('=== POTENTIAL ISSUES TO CHECK ===');
console.log('1. HTML structure changes during setContent()');
console.log('2. List nesting depth calculation issues');
console.log('3. CSS styling not applied correctly after reload');
console.log('4. Extension decorations not being reapplied');
console.log('5. StarterKit list configuration conflicts');