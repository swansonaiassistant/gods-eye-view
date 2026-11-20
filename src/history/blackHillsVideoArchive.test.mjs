import test from 'node:test';
import assert from 'node:assert/strict';
import { initBlackHillsVideoArchive } from './blackHillsVideoArchive.js';

function fakeDocument() {
  const elements = [];
  const createElement = (tagName) => {
    const attrs = new Map();
    const listeners = new Map();
    const element = {
      tagName, children: [], hidden: false, removed: false, style: {},
      setAttribute(name, value) { attrs.set(name, value); },
      getAttribute(name) { return attrs.get(name); },
      append(...children) { this.children.push(...children); },
      addEventListener(name, handler) { listeners.set(name, handler); },
      click() { listeners.get('click')?.(); },
      remove() { this.removed = true; },
    };
    elements.push(element);
    return element;
  };
  return {
    elements,
    createElement,
    body: { append() {} },
    getElementById(id) { return elements.find((item) => item.id === id && !item.removed); },
    querySelectorAll(selector) {
      return selector === '[data-gev-research-panel]'
        ? elements.filter((item) => item.getAttribute('data-gev-research-panel') !== undefined && !item.removed) : [];
    },
    querySelector(selector) {
      const id = /^\[aria-controls="([^"]+)"\]$/.exec(selector)?.[1];
      return elements.find((item) => item.getAttribute('aria-controls') === id && !item.removed);
    },
  };
}

test('archive opens safely, closes another research panel, and uses outbound YouTube links', () => {
  const doc = fakeDocument();
  const otherPanel = doc.createElement('aside');
  otherPanel.id = 'gev-historic-expeditions';
  otherPanel.hidden = false;
  otherPanel.setAttribute('data-gev-research-panel', '');
  const otherButton = doc.createElement('button');
  otherButton.setAttribute('aria-controls', otherPanel.id);
  otherButton.setAttribute('aria-expanded', 'true');
  const cleanup = initBlackHillsVideoArchive({ documentRef: doc });
  const panel = doc.getElementById('gev-black-hills-video-archive');
  const toggle = doc.querySelector('[aria-controls="gev-black-hills-video-archive"]');
  assert.equal(panel.hidden, true);
  toggle.click();
  assert.equal(panel.hidden, false);
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(otherPanel.hidden, true);
  assert.equal(otherButton.getAttribute('aria-expanded'), 'false');
  const links = doc.elements.filter((item) => item.tagName === 'a');
  assert.equal(links.length, 1);
  assert.equal(links[0].href, 'https://www.youtube.com/watch?v=NdKwv8Nmaw0');
  assert.equal(links[0].rel, 'noopener noreferrer');
  toggle.click();
  assert.equal(panel.hidden, true);
  cleanup();
  assert.equal(panel.removed, true);
  assert.equal(toggle.removed, true);
});
