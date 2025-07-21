#!/usr/bin/env node

// Debug script to test nested list loading and rendering behavior

import { JSDOM } from 'jsdom';

// Test HTML structure for nested lists
const nestedListHTML = `
<ul>
  <li>
    <p>Top level item 1</p>
    <ul>
      <li>
        <p>Nested item 1.1</p>
        <ul>
          <li><p>Deep nested item 1.1.1</p></li>
          <li><p>Deep nested item 1.1.2</p></li>
        </ul>
      </li>
      <li><p>Nested item 1.2</p></li>
    </ul>
  </li>
  <li><p>Top level item 2</p></li>
</ul>
`;

console.log('🧪 Testing nested list HTML structure...\n');

// Parse the HTML
const dom = new JSDOM(nestedListHTML);
const document = dom.window.document;

// Analyze the structure
function analyzeList(element, depth = 0) {
  const indent = '  '.repeat(depth);
  const tagName = element.tagName.toLowerCase();
  
  if (tagName === 'ul' || tagName === 'ol') {
    console.log(`${indent}📋 ${tagName.toUpperCase()} (depth: ${depth})`);
    
    // Analyze list items
    const listItems = element.querySelectorAll(':scope > li');
    listItems.forEach((li, index) => {
      console.log(`${indent}  📝 LI ${index + 1}`);
      
      // Check for nested lists within this item
      const nestedLists = li.querySelectorAll(':scope > ul, :scope > ol');
      nestedLists.forEach((nestedList) => {
        analyzeList(nestedList, depth + 1);
      });
    });
  }
}

const rootList = document.querySelector('ul');
if (rootList) {
  analyzeList(rootList);
} else {
  console.log('❌ No root list found');
}

console.log('\n📊 Structure Analysis:');
console.log('- Total nested levels:', document.querySelectorAll('ul ul').length > 0 ? 'YES' : 'NO');
console.log('- Deepest nesting level:', getDeepestLevel(rootList));
console.log('- Total list items:', document.querySelectorAll('li').length);

function getDeepestLevel(element, currentLevel = 1) {
  let maxLevel = currentLevel;
  
  const nestedLists = element.querySelectorAll(':scope > li > ul, :scope > li > ol');
  nestedLists.forEach(nestedList => {
    const nestedLevel = getDeepestLevel(nestedList, currentLevel + 1);
    maxLevel = Math.max(maxLevel, nestedLevel);
  });
  
  return maxLevel;
}

// Test ProseMirror-style position calculation
console.log('\n🎯 Position Analysis (simulating ProseMirror):');

function simulateProseMirrorAnalysis(element, depth = 0) {
  if (element.tagName === 'LI') {
    console.log(`List item at depth ${depth}:`);
    console.log(`  - Should have level-${depth} decoration`);
    console.log(`  - CSS class: list-item-level-${Math.min(depth, 6)}`);
    console.log('');
  }
  
  Array.from(element.children).forEach(child => {
    if (child.tagName === 'UL' || child.tagName === 'OL') {
      simulateProseMirrorAnalysis(child, depth + 1);
    } else if (child.tagName === 'LI') {
      simulateProseMirrorAnalysis(child, depth);
    }
  });
}

simulateProseMirrorAnalysis(rootList, 1);

console.log('🔍 Expected decorations for our current HTML structure:');
const listItems = document.querySelectorAll('li');
listItems.forEach((li, index) => {
  const level = getListItemLevel(li);
  console.log(`  - Item ${index + 1}: level ${level} ${level > 1 ? '✅ Should get decoration' : '❌ No decoration (level 1)'}`);
});

function getListItemLevel(listItem) {
  let level = 1;
  let parent = listItem.parentElement;
  
  while (parent) {
    if (parent.tagName === 'UL' || parent.tagName === 'OL') {
      // Check if this list is nested inside another list item
      const listParent = parent.parentElement;
      if (listParent && listParent.tagName === 'LI') {
        level++;
        parent = listParent.parentElement;
      } else {
        break;
      }
    } else {
      parent = parent.parentElement;
    }
  }
  
  return level;
}
