/**
 * Custom ESLint rules for Scribble project
 * Enforces theme token usage and prevents hardcoded colors
 */

module.exports = {
  rules: {
    'no-hardcoded-colors': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow hardcoded color values - use theme tokens instead',
          category: 'Best Practices',
          recommended: true
        },
        fixable: null,
        schema: [],
        messages: {
          avoidHardcodedColor: 'Avoid hardcoded color "{{color}}". Use theme tokens from hsl(var(--token)) instead.',
          avoidRgbColor: 'Avoid RGB color "{{color}}". Use theme tokens from hsl(var(--token)) instead.',
          avoidHslColor: 'Avoid HSL color "{{color}}". Use theme tokens like hsl(var(--token)) instead.',
          avoidHexColor: 'Avoid hex color "{{color}}". Use theme tokens from hsl(var(--token)) instead.'
        }
      },
      create(context) {
        // Patterns for different color formats
        const hexPattern = /#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})\b/gi;
        const rgbPattern = /rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+/gi;
        const hslPattern = /hsla?\s*\(\s*\d+/gi;
        const namedColors = [
          'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink',
          'brown', 'gray', 'grey', 'black', 'white', 'cyan', 'magenta',
          'lime', 'olive', 'navy', 'teal', 'silver', 'maroon'
        ];

        // Files/paths to exclude from this rule
        const excludedPaths = [
          'theme.ts',
          'theme.js',
          'theme-plugin.js',
          'tailwind.config',
          'colors.ts',
          'constants/colors',
          '.css',
          '.scss',
          'test',
          'spec'
        ];

        // Allowed exceptions (like transparent, inherit, currentColor)
        const allowedValues = [
          'transparent',
          'inherit',
          'initial',
          'unset',
          'currentColor',
          'none'
        ];

        function checkNode(node, value) {
          const filename = context.getFilename();
          
          // Skip files that should contain color definitions
          if (excludedPaths.some(path => filename.includes(path))) {
            return;
          }

          // Skip allowed values
          if (allowedValues.some(allowed => value.toLowerCase().includes(allowed))) {
            return;
          }

          // Check for hex colors
          const hexMatches = value.match(hexPattern);
          if (hexMatches) {
            hexMatches.forEach(match => {
              context.report({
                node,
                messageId: 'avoidHexColor',
                data: { color: match }
              });
            });
          }

          // Check for rgb/rgba colors
          if (rgbPattern.test(value)) {
            context.report({
              node,
              messageId: 'avoidRgbColor',
              data: { color: value }
            });
          }

          // Check for hardcoded hsl (not using CSS variables)
          if (hslPattern.test(value) && !value.includes('var(--')) {
            context.report({
              node,
              messageId: 'avoidHslColor',
              data: { color: value }
            });
          }

          // Check for named colors (except in variable names)
          const lowerValue = value.toLowerCase();
          namedColors.forEach(color => {
            // Make sure it's not part of a variable name like "primaryColor"
            const colorRegex = new RegExp(`\\b${color}\\b`, 'i');
            if (colorRegex.test(lowerValue) && !value.includes('Color') && !value.includes('--')) {
              context.report({
                node,
                messageId: 'avoidHardcodedColor',
                data: { color: color }
              });
            }
          });
        }

        return {
          // Check string literals
          Literal(node) {
            if (typeof node.value === 'string') {
              checkNode(node, node.value);
            }
          },

          // Check template literals
          TemplateLiteral(node) {
            const value = node.quasis.map(q => q.value.raw).join('');
            checkNode(node, value);
          },

          // Check JSX attributes for style props
          JSXAttribute(node) {
            if (node.name.name === 'style' && node.value) {
              // Handle object expression in style
              if (node.value.expression && node.value.expression.type === 'ObjectExpression') {
                node.value.expression.properties.forEach(prop => {
                  if (prop.key && prop.value && prop.value.type === 'Literal') {
                    const propName = prop.key.name || prop.key.value;
                    const colorProps = [
                      'color', 'backgroundColor', 'borderColor', 'background',
                      'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
                      'outlineColor', 'textDecorationColor', 'fill', 'stroke'
                    ];
                    
                    if (colorProps.includes(propName)) {
                      checkNode(prop.value, prop.value.value);
                    }
                  }
                });
              }
            }

            // Check className for Tailwind color classes
            if (node.name.name === 'className' && node.value && node.value.type === 'Literal') {
              const classes = node.value.value.split(' ');
              classes.forEach(cls => {
                // Check for Tailwind color utilities with hardcoded values
                if (cls.match(/^(bg|text|border|ring|from|to|via)-\[#/)) {
                  context.report({
                    node: node.value,
                    messageId: 'avoidHardcodedColor',
                    data: { color: cls }
                  });
                }
              });
            }
          }
        };
      }
    }
  }
};
