import test from 'node:test';
import assert from 'node:assert/strict';
import { initBlackHillsExpeditionsPanel } from './blackHillsExpeditionsPanel.js';
import { EXPEDITIONS, ENGAGEMENTS, HISTORICAL_CONTEXT } from './blackHillsExpeditionsCatalog.js';

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
    elements, createElement, body: { append() {} },
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

test('historical panel shows sourced rows and closes the video panel on open', () => {
  const doc = fakeDocument();
  const videoPanel = doc.createElement('aside');
  videoPanel.id = 'gev-black-hills-video-archive';
  videoPanel.setAttribute('data-gev-research-panel', '');
  const videoButton = doc.createElement('button');
  videoButton.setAttribute('aria-controls', videoPanel.id);
  videoButton.setAttribute('aria-expanded', 'true');
  const cleanup = initBlackHillsExpeditionsPanel(doc);
  const panel = doc.getElementById('gev-historic-expeditions');
  const button = doc.querySelector('[aria-controls="gev-historic-expeditions"]');
  assert.equal(panel.hidden, true);
  button.click();
  assert.equal(panel.hidden, false);
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.equal(videoPanel.hidden, true);
  assert.equal(videoButton.getAttribute('aria-expanded'), 'false');
  const links = doc.elements.filter((item) => item.tagName === 'a');
  assert.equal(links.length, EXPEDITIONS.length + ENGAGEMENTS.length + HISTORICAL_CONTEXT.length);
  assert.ok(links.every((link) => link.href.startsWith('https://')
    && link.target === '_blank' && link.rel === 'noopener noreferrer'));
  button.click();
  assert.equal(panel.hidden, true);
  cleanup();
  assert.equal(panel.removed, true);
});
