// Created by weixi on 2026/10/25.
const wrapper = children => ({
  type: 'element', tagName: 'div',
  properties: { className: ['prose-table'], tabIndex: 0 }, children,
});

export const satteriProseTables = {
  name: 'prose-tables',
  element: {
    filter: ['table'],
    visit(node, context) { context.wrapNode(node, wrapper([])); },
  },
};

export function rehypeProseTables() {
  return tree => {
    function visit(parent) {
      if (!parent.children) return;
      parent.children = parent.children.map(node => {
        if (node.type === 'element' && node.tagName === 'table') return wrapper([node]);
        visit(node);
        return node;
      });
    }
    visit(tree);
  };
}
