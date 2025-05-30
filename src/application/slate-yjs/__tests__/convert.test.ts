import { YjsEditorKey, YSharedRoot } from '@/application/types';
import { generateId, getTestingDocData, insertBlock, withTestingYDoc } from './withTestingYjsEditor';
import { yDocToSlateContent, deltaInsertToSlateNode, yDataToSlateContent } from '@/application/slate-yjs/utils/convert';
import { expect } from '@jest/globals';
import * as Y from 'yjs';

jest.mock('nanoid');

describe('convert yjs data to slate content', () => {
  it('should return undefined if root block is not exist', () => {
    const doc = new Y.Doc();

    const sharedRoot = doc.getMap(YjsEditorKey.data_section) as YSharedRoot;
    expect(yDocToSlateContent(doc)).toBeUndefined();

    const doc2 = withTestingYDoc('1');
    const { blocks, pageId } = getTestingDocData(doc2);
    expect(yDataToSlateContent(sharedRoot)).toBeUndefined();

    blocks.delete(pageId);

    expect(yDataToSlateContent(sharedRoot)).toBeUndefined();
  });
  it('should match empty array', () => {
    const doc = withTestingYDoc('1');
    const slateContent = yDocToSlateContent(doc)!;

    expect(slateContent).not.toBeUndefined();
    expect(slateContent.children).toMatchObject([]);
  });
  it('should match single paragraph', () => {
    const doc = withTestingYDoc('1');
    const id = generateId();

    const { applyDelta } = insertBlock({
      doc,
      blockObject: {
        id,
        ty: 'paragraph',
        relation_id: id,
        text_id: id,
        data: JSON.stringify({ level: 1 }),
      },
    });

    applyDelta([{ insert: 'Hello ' }, { insert: 'World', attributes: { bold: true } }]);
    const slateContent = yDocToSlateContent(doc)!;

    expect(slateContent).not.toBeUndefined();
    expect(slateContent.children).toEqual([
      {
        blockId: id,
        relationId: id,
        type: 'paragraph',
        data: { level: 1 },
        children: [
          {
            textId: id,
            type: 'text',
            children: [{ text: 'Hello ' }, { text: 'World', bold: true }],
          },
        ],
      },
    ]);
  });
  it('should match nesting paragraphs', () => {
    const doc = withTestingYDoc('1');
    const id1 = generateId();
    const id2 = generateId();

    const { applyDelta, appendChild } = insertBlock({
      doc,
      blockObject: {
        id: id1,
        ty: 'paragraph',
        relation_id: id1,
        text_id: id1,
        data: '',
      },
    });

    applyDelta([{ insert: 'Hello ' }, { insert: 'World', attributes: { bold: true } }]);
    appendChild({
      id: id2,
      ty: 'paragraph',
      relation_id: id2,
      text_id: id2,
      data: '',
    }).applyDelta([{ insert: 'I am nested' }]);

    const slateContent = yDocToSlateContent(doc)!;

    expect(slateContent).not.toBeUndefined();
    expect(slateContent.children).toEqual([
      {
        blockId: id1,
        relationId: id1,
        type: 'paragraph',
        data: {},
        children: [
          {
            textId: id1,
            type: 'text',
            children: [{ text: 'Hello ' }, { text: 'World', bold: true }],
          },
          {
            blockId: id2,
            relationId: id2,
            type: 'paragraph',
            data: {},
            children: [{ textId: id2, type: 'text', children: [{ text: 'I am nested' }] }],
          },
        ],
      },
    ]);
  });
  it('should compatible with delta in data', () => {
    const doc = withTestingYDoc('1');
    const id = generateId();

    insertBlock({
      doc,
      blockObject: {
        id,
        ty: 'paragraph',
        relation_id: id,
        text_id: id,
        data: JSON.stringify({
          delta: [
            { insert: 'Hello ' },
            { insert: 'World', attributes: { bold: true } },
            { insert: ' ', attributes: { code: true } },
          ],
        }),
      },
    });

    const slateContent = yDocToSlateContent(doc)!;

    expect(slateContent).not.toBeUndefined();
    expect(slateContent.children).toEqual([
      {
        blockId: id,
        relationId: id,
        type: 'paragraph',
        data: {
          delta: [
            { insert: 'Hello ' },
            { insert: 'World', attributes: { bold: true } },
            {
              insert: ' ',
              attributes: { code: true },
            },
          ],
        },
        children: [
          {
            textId: id,
            type: 'text',
            children: [{ text: 'Hello ' }, { text: 'World', bold: true }, { text: ' ', code: true }],
          },
          {
            text: '',
          },
        ],
      },
    ]);
  });
  it('should return undefined if data is invalid', () => {
    const doc = withTestingYDoc('1');
    const id = generateId();

    insertBlock({
      doc,
      blockObject: {
        id,
        ty: 'paragraph',
        relation_id: id,
        text_id: id,
        data: 'invalid',
      },
    });

    const slateContent = yDocToSlateContent(doc)!;

    expect(slateContent).not.toBeUndefined();
    expect(slateContent.children).toEqual([undefined]);
  });
  it('should return a normalize node if the delta is not exist', () => {
    const doc = withTestingYDoc('1');
    const id = generateId();

    insertBlock({
      doc,
      blockObject: {
        id,
        ty: 'paragraph',
        relation_id: id,
        text_id: id,
        data: JSON.stringify({}),
      },
    });

    const slateContent = yDocToSlateContent(doc)!;

    expect(slateContent).not.toBeUndefined();
    expect(slateContent.children).toEqual([
      {
        blockId: id,
        relationId: id,
        type: 'paragraph',
        data: {},
        children: [{ text: '' }],
      },
    ]);
  });
});

describe('test deltaInsertToSlateNode', () => {
  it('should match text node', () => {
    const node = deltaInsertToSlateNode({ insert: 'Hello' });

    expect(node).toEqual({ text: 'Hello' });
  });

  it('should match text node with attributes', () => {
    const node = deltaInsertToSlateNode({ insert: 'Hello', attributes: { bold: true } });

    expect(node).toEqual({ text: 'Hello', bold: true });
  });

  it('should delete empty string attributes', () => {
    const node = deltaInsertToSlateNode({ insert: 'Hello', attributes: { bold: false, font_color: '' } });

    expect(node).toEqual({ text: 'Hello' });
  });

  it('should ensure undo/redo works', () => {

    const doc = new Y.Doc();
    const sharedRoot = doc.getMap('data_section');
    const document = new Y.Map();
    sharedRoot.set('document', document);
    const ytext = new Y.Text();
    document.set('1', ytext);
    const undoManager = new Y.UndoManager(sharedRoot, { trackedOrigins: new Set(['local', 'undo', null]) });

    doc.transact(() => {
      ytext.insert(0, 'Hello');
    }, 'local');
    undoManager.undo();
    expect(ytext.toString()).toBe('');
    undoManager.redo();
    expect(ytext.toString()).toBe('Hello');

  });
});
