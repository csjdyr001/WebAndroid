const WORD_START_DOCUMENT = 0x00080003;

const WORD_STRING_TABLE = 0x001C0001;
const WORD_RES_TABLE = 0x00080180;

const WORD_START_NS = 0x00100100;
const WORD_END_NS = 0x00100101;
const WORD_START_TAG = 0x00100102;
const WORD_END_TAG = 0x00100103;
const WORD_TEXT = 0x00100104;
const WORD_EOS = 0xFFFFFFFF;
const WORD_SIZE = 4;

const TYPE_ID_REF = 0x01000008;
const TYPE_ATTR_REF = 0x02000008;
const TYPE_STRING = 0x03000008;
const TYPE_DIMEN = 0x05000008;
const TYPE_FRACTION = 0x06000008;
const TYPE_INT = 0x10000008;
const TYPE_FLOAT = 0x04000008;

const TYPE_FLAGS = 0x11000008;
const TYPE_BOOL = 0x12000008;
const TYPE_COLOR = 0x1C000008;
const TYPE_COLOR2 = 0x1D000008;

const DIMEN = ["px", "dp", "sp", "pt", "in", "mm"];

function analyse(buf, mListener) {
    mListener = mListener || {};

    // Global variables
    let mStringsCount;
    let mStylesCount;
    let mStringsTable;
    let mFlags;

    let mResCount;
    let mResourcesIds;

    const mNamespaces = new Map();

    let mParserOffset = 0;
    while (mParserOffset < buf.length) {
        const word0 = readUInt32LE(buf,mParserOffset);
        switch (word0) {
            case WORD_START_DOCUMENT:
            //console.log(1)
                parseStartDocument();
                break;
            case WORD_STRING_TABLE:
            //console.log(2)
                parseStringTable();
                break;
            case WORD_RES_TABLE:
            //console.log(3)
                parseResourceTable();
                break;
            case WORD_START_NS:
            //console.log(4)
                parseNamespace(true);
                break;
            case WORD_END_NS:
            //console.log(5)
                parseNamespace(false);
                break;
            case WORD_START_TAG:
            //console.log(6)
                parseStartTag();
                break;
            case WORD_END_TAG:
            //console.log(7)
                parseEndTag();
                break;
            case WORD_TEXT:
            //console.log(8)
                parseText();
                break;
            case WORD_EOS:
            //console.log(9)
                if (mListener['endDocument']) {
                    mListener['endDocument']();
                }
                break;
            default:
            //console.log(0)
                mParserOffset += WORD_SIZE;
                break;
        }
    }

    if (mListener['endDocument']) {
        mListener['endDocument']();
    }

    function parseStartDocument() {
        if (mListener['startDocument']) {
            mListener['startDocument']();
        }
        mParserOffset += (2 * WORD_SIZE);
    }

    function parseStringTable() {
        const chunk = readUInt32LE(buf,mParserOffset + (WORD_SIZE));
        mStringsCount = readUInt32LE(buf,mParserOffset + (2 * WORD_SIZE));
        mStylesCount = readUInt32LE(buf,mParserOffset + (3 * WORD_SIZE));
        mFlags = readUInt32LE(buf,mParserOffset + (4 * WORD_SIZE));
        const strOffset = mParserOffset
            + readUInt32LE(buf,mParserOffset + (5 * WORD_SIZE));
        const styleOffset = readUInt32LE(buf,mParserOffset + (6 * WORD_SIZE));

        mStringsTable = [];
        for (let i = 0; i < mStringsCount; ++i) {
            const offset = strOffset
                + readUInt32LE(buf,mParserOffset + ((i + 7) * WORD_SIZE));
            mStringsTable[i] = getStringFromStringTable(offset);
        }

        if (styleOffset > 0) {
            for (let i = 0; i < mStylesCount; ++i) {
                // TODO read the styles ???
            }
        }

        mParserOffset += chunk;
    }

    function parseResourceTable() {
        const chunk = readUInt32LE(buf,mParserOffset + (WORD_SIZE));
        mResCount = (chunk / 4) - 2;

        mResourcesIds = [];
        for (let i = 0; i < mResCount; ++i) {
            mResourcesIds[i] = readUInt32LE(buf,mParserOffset + ((i + 2) * WORD_SIZE));
        }

        mParserOffset += chunk;
    }


    function parseNamespace(start) {
        const prefixIdx = readUInt32LE(buf,mParserOffset + (4 * WORD_SIZE));
        const uriIdx = readUInt32LE(buf,mParserOffset + (5 * WORD_SIZE));

        const uri = getString(uriIdx);
        const prefix = getString(prefixIdx);

        if (start) {
            if (mListener['startPrefixMapping']) {
                mListener['startPrefixMapping'](prefix, uri);
            }
            mNamespaces.set(uri, prefix);
        } else {
            if (mListener['endPrefixMapping']) {
                mListener['endPrefixMapping'](prefix, uri);
            }
            mNamespaces.delete(uri);
        }
        mParserOffset += (6 * WORD_SIZE);
    }

    function parseStartTag() {
        const uriIdx = readUInt32LE(buf,mParserOffset + (4 * WORD_SIZE));
        const nameIdx = readUInt32LE(buf,mParserOffset + (5 * WORD_SIZE));
        const attrCount = readUInt16LE(buf,mParserOffset + (7 * WORD_SIZE));
        const name = getString(nameIdx);
        let uri, qname;
        if (uriIdx === 0xFFFFFFFF) {
            uri = "";
            qname = name;
        } else {
            uri = getString(uriIdx);
            if (mNamespaces.has(uri)) {
                qname = mNamespaces.get(uri) + ':' + name;
            } else {
                qname = name;
            }
        }
        
        mParserOffset += (9 * WORD_SIZE);

        const attrs = [];
        for (let a = 0; a < attrCount; a++) {
            attrs[a] = parseAttribute();
            mParserOffset += (5 * 4);
        }

        if (mListener['startElement']) {
            mListener['startElement'](uri, name, qname, attrs);
        }
    }

    function parseAttribute() {
        const attrNSIdx = readUInt32LE(buf,mParserOffset);
        const attrNameIdx = readUInt32LE(buf,mParserOffset + (WORD_SIZE));
        const attrValueIdx = readUInt32LE(buf,mParserOffset + (2 * WORD_SIZE));
        const attrType = readUInt32LE(buf,mParserOffset + (3 * WORD_SIZE));
        const attrData = readUInt32LE(buf,mParserOffset + (4 * WORD_SIZE));

        const attr = {
            name: getString(attrNameIdx),
        };

        if (attrNSIdx === 0xFFFFFFFF) {
            attr['namespace'] = null;
            attr['prefix'] = null;
        } else {
            const uri = getString(attrNSIdx);
            if (mNamespaces.has(uri)) {
                attr['namespace'] = uri;
                attr['prefix'] = mNamespaces.get(uri);
            }
        }

        if (attrValueIdx === 0xFFFFFFFF) {
            attr['value'] = getAttributeValue(attrType, attrData);
        } else {
            attr['value'] = getString(attrValueIdx);
        }

        return attr;

    }

    function parseText() {
        const strIndex = readUInt32LE(buf,mParserOffset + (4 * WORD_SIZE));

        const data = getString(strIndex);
        mListener.characterData(data);

        mParserOffset += (7 * WORD_SIZE);
    }

    function parseEndTag() {
        const uriIdx = readUInt32LE(buf,mParserOffset + (4 * WORD_SIZE));
        const nameIdx = readUInt32LE(buf,mParserOffset + (5 * WORD_SIZE));

        const name = getString(nameIdx);
        let uri;
        if (uriIdx === 0xFFFFFFFF) {
            uri = "";
        } else {
            uri = getString(uriIdx);
        }

        if (mListener['endElement']) {
            mListener['endElement'](uri, name, null);
        }
        mParserOffset += (6 * WORD_SIZE);
    }

    function getString(index) {
        if ((index >= 0) && (index < mStringsCount)) {
            return mStringsTable[index];
        } else {
            return null;
        }
    }

    function getStringFromStringTable(offset) {
        if (mFlags & 0x100) {
            const s = readUInt8(buf,offset);
            const l = readUInt8(buf,offset + 1);
            offset += 2;

            return slice(buf,offset, offset + l).toString();
        } else {
            const l = readUInt16LE(buf,offset);
            offset += 2;

            const str = slice(buf,offset, offset + l*2);
            return utf16BytesToString(str);
        }
    }

    function utf16BytesToString(binaryStr) {
        const cp = [];
        for(let i = 0; i < binaryStr.length; i += 2) {
            cp.push(
                binaryStr[i] |
                ( binaryStr[i+1] << 8 )
            );
        }
        return String.fromCharCode.apply( String, cp );
    }

    function getAttributeValue(type, data) {
        switch (type) {
            case TYPE_STRING:
                return getString(data);
            case TYPE_DIMEN:
                return (data >> 8) + DIMEN[data & 0xFF];
            case TYPE_FRACTION:
                const fracValue = data / 0x7FFFFFFF;
                return sprintf("%.2f", fracValue);
            case TYPE_FLOAT:
                const buf = new ArrayBuffer(4);
                (new Float32Array(buf))[0] = data;
                return (new Uint32Array(buf))[0];
            case TYPE_INT:
            case TYPE_FLAGS:
                return data;
            case TYPE_BOOL:
                return data !== 0;
            case TYPE_COLOR:
            case TYPE_COLOR2:
                return sprintf("#%08X", data);
            case TYPE_ID_REF:
                return sprintf("@id/0x%08X", data);
            case TYPE_ATTR_REF:
                return sprintf("?id/0x%08X", data);
            default:
                return sprintf("%08X/0x%08X", type, data);
        }
    }
}

function parse(buf) {
    const root = {
        uri: '',
        localName: '',
        qName: '',
        prefixes: [],
        attrs: [],
        children: [],
    };
    const nodes = [root];
    const prefixes = [[]];

    function getLatestNode() {
        return nodes[nodes.length - 1];
    }

    analyse(buf, {
        startDocument: function () {},
        endDocument: function () {},

        startPrefixMapping: function (prefix, uri) {
            prefixes[prefixes.length - 1].push([prefix, uri]);
        },
        
        endPrefixMapping: function (prefix, uri) {
            prefixes[prefixes.length - 1].pop();
        },

        startElement: function (uri, localName, qName, atts) {
            const node = {
                uri: uri,
                localName: localName,
                qName: qName,
                prefixes: [],
                attrs: atts,
                children: []
            };
            getLatestNode().children.push(node);
            nodes.push(node);
            prefixes.push([]);
        },

        endElement: function (uri, localName, qName) {
            const node = nodes.pop();
            prefixes.pop();
            node.prefixes = slice(prefixes[prefixes.length - 1],0);
        },
    });
    return root.children[0];
}

function convert(axml){
    var buf = fromArrayBuffer(str2ab(axml));
    const tree = parse(buf);
    const xml = [];
    xml.push('<?xml version="1.0" encoding="utf-8"?>\n')
    xml.push(printTree(tree, 0));

    function printTree(node, depth) {
    const buff = [];
    for (let i = 0; i < depth; i++) {
        buff.push("\t");
    }
    if (node && node.qName) {
        buff.push("<", node.qName);

        node.prefixes.forEach(function (prefix) {
            buff.push(" xmlns:");
            buff.push(prefix[0] + '="' + prefix[1] + '"');
        });

        node.attrs.forEach(function (attr) {
            buff.push(" ");
            if (attr["prefix"]) {
                buff.push(attr["prefix"] + ":");
            }
            buff.push(attr["name"] + '="' + attr["value"] + '"');
        });

        if (!node.children.length) {
            buff.push(" /");
        }
        buff.push(">\n");

        if (node.children.length > 0) {
            node.children.forEach(function (child) {
                buff.push(printTree(child, depth + 1));
            });
            for (let i = 0; i < depth; i++) {
                buff.push("\t");
            }
            buff.push("</" + node.qName + ">\n");
        }
    }

    return buff.join("");
}

    return xml.join('');
}

function readUInt32LE(buf,offset, noAssert = true) {
  offset = offset >>> 0;
  if (!noAssert)
    checkOffset(offset, 4, buf.length);

  return ((buf[offset]) |
      (buf[offset + 1] << 8) |
      (buf[offset + 2] << 16)) +
      (buf[offset + 3] * 0x1000000);
};
function checkOffset(offset, ext, length) {
  if (offset + ext > length)
    throw new RangeError('ERR_INDEX_OUT_OF_RANGE');
}
class FastBuffer extends Uint8Array {
  constructor(arg1, arg2, arg3) {
    super(arg1, arg2, arg3);
  }
}
function fromArrayBuffer(obj, byteOffset, length) {
  // convert byteOffset to integer
  if (byteOffset === undefined) {
    byteOffset = 0;
  } else {
    byteOffset = +byteOffset;
    // check for NaN
    if (byteOffset !== byteOffset)
      byteOffset = 0;
  }

  const maxLength = obj.byteLength - byteOffset;

  if (maxLength < 0)
    throw new RangeError('ERR_BUFFER_OUT_OF_BOUNDS', 'offset');

  if (length === undefined) {
    length = maxLength;
  } else {
    // convert length to non-negative integer
    length = +length;
    // Check for NaN
    if (length !== length) {
      length = 0;
    } else if (length > 0) {
      if (length > maxLength)
        throw new RangeError('ERR_BUFFER_OUT_OF_BOUNDS', 'length');
    } else {
      length = 0;
    }
  }

  return new FastBuffer(obj, byteOffset, length);
}
function str2ab(str) {
    var buf = new ArrayBuffer(str.length * 2); // 每个字符占用2个字节
    var bufView = new Uint8Array(buf);// Uint8Array可换成其它
    for (var i=0, strLen=str.length; i<strLen; i++) {
         bufView[i] = str.charCodeAt(i);
    }
    return buf;
}
function readUInt16LE(buf,offset, noAssert = true) {
  offset = offset >>> 0;
  if (!noAssert)
    checkOffset(offset, 2, buf.length);
  return buf[offset] | (buf[offset + 1] << 8);
};
function readUInt8(buf,offset, noAssert = true) {
  offset = offset >>> 0;
  if (!noAssert)
    checkOffset(offset, 1, buf.length);
  return buf[offset];
};
function adjustOffset(offset, length) {
  // Use Math.trunc() to convert offset to an integer value that can be larger
  // than an Int32. Hence, don't use offset | 0 or similar techniques.
  offset = Math.trunc(offset);
  // `x !== x`-style conditionals are a faster form of `isNaN(x)`
  if (offset === 0 || offset !== offset) {
    return 0;
  } else if (offset < 0) {
    offset += length;
    return offset > 0 ? offset : 0;
  } else {
    return offset < length ? offset : length;
  }
}
function slice(buf,start, end) {
  const srcLength = buf.length;
  start = adjustOffset(start, srcLength);
  end = end !== undefined ? adjustOffset(end, srcLength) : srcLength;
  const newLength = end > start ? end - start : 0;
  return new FastBuffer(buf.buffer, buf.byteOffset + start, newLength);
};