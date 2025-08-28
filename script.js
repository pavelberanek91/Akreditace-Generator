let editorForma, editorTemata, editorMetody;
const editors = {}; // více CKEditorů (literatura, pomůcky)


// Inicializace hlavních editorů
ClassicEditor.create(document.querySelector('#forma'))
  .then(editor => editorForma = editor);
ClassicEditor.create(document.querySelector('#temata'))
  .then(editor => editorTemata = editor);
ClassicEditor.create(document.querySelector('#metody'))
  .then(editor => editorMetody = editor);


// Dynamické přidání editoru (literatura, pomůcky)
let editorCounter = 0;
function addEditor(containerId) {
  editorCounter++;
  const container = document.getElementById(containerId);
  const wrapper = document.createElement("div");
  wrapper.classList.add("mb-3");
  wrapper.innerHTML = `
    <div id="${containerId}_editor_${editorCounter}" class="editor"></div>
    <button class="btn btn-sm btn-outline-danger mt-1" type="button" onclick="removeEditor('${containerId}_editor_${editorCounter}', this)">Odstranit položku</button>
  `;
  container.appendChild(wrapper);

  ClassicEditor.create(document.querySelector(`#${containerId}_editor_${editorCounter}`))
    .then(editor => { editors[`${containerId}_editor_${editorCounter}`] = editor; });
}

function removeEditor(editorId, btn) {
  if (editors[editorId]) {
    editors[editorId].destroy().then(() => {
      delete editors[editorId];
      btn.parentNode.remove();
    });
  }
}

function collectEditors(prefix) {
  const results = [];
  for (const key in editors) {
    if (key.startsWith(prefix)) {
      const data = editors[key].getData();
      if (data.trim()) results.push(data);
    }
  }
  return results;
}


function stripParagraphs(html) {
  // odstraní obalující <p> kolem obsahu <li>
  return html
    .replace(/<p>(.*?)<\/p>/gi, '$1') // nahradí <p>text</p> -> text
    .replace(/\s+/g, ' ')             // odstraní nadbytečné mezery
    .trim();
}


function formatXml(xml) {
  const PADDING = '  ';
  const reg = /(>)(<)(\/*)/g;
  let pad = 0;
  xml = xml.replace(reg, '$1\n$2$3');
  return xml.split('\n').map((node) => {
    let indent = '';
    if (node.match(/.+<\/\w[^>]*>$/)) {
      indent = PADDING.repeat(pad);
    } else if (node.match(/^<\/\w/)) {
      pad = Math.max(pad - 1, 0);
      indent = PADDING.repeat(pad);
    } else if (node.match(/^<\w([^>]*[^/])?>.*$/)) {
      indent = PADDING.repeat(pad);
      pad++;
    } else {
      indent = PADDING.repeat(pad);
    }
    return indent + node;
  }).join('\n');
}


function buildXML() {
  const predmetId = document.getElementById("predmetId").value;
  const forma = editorForma.getData();
  const temata = editorTemata.getData();
  const metody = editorMetody.getData();

  const povinna = collectEditors("literaturaPovinna");
  const doporucena = collectEditors("literaturaDoporucena");
  const pomucky = collectEditors("pomucky");

  let xml = `<předmět id="${predmetId}" xmlns="http://ki.ujep.cz/ns/akreditace">\n`;

  xml += `  <forma-ověření>\n    <div xmlns="http://www.w3.org/1999/xhtml">\n${stripParagraphs(forma)}\n    </div>\n  </forma-ověření>\n`;
  xml += `  <hlavní-témata>\n    <div xmlns="http://www.w3.org/1999/xhtml">\n${temata}\n    </div>\n  </hlavní-témata>\n`;
  xml += `  <metody-výuky>\n    <div xmlns="http://www.w3.org/1999/xhtml">\n${metody}\n    </div>\n  </metody-výuky>\n`;

  xml += `  <studijní-literatura>\n    <div xmlns="http://www.w3.org/1999/xhtml">\n`;

  if (povinna.length > 0) {
    xml += `      <div class="subhead">Povinná:</div>\n      <div class="bibliography">\n`;
    povinna.forEach(item => xml += `        <div class="bibitem">${stripParagraphs(item)}</div>\n`);
    xml += `      </div>\n`;
  }
  if (doporucena.length > 0) {
    xml += `      <div class="subhead">Doporučená:</div>\n      <div class="bibliography">\n`;
    doporucena.forEach(item => xml += `        <div class="bibitem">${stripParagraphs(item)}</div>\n`);
    xml += `      </div>\n`;
  }
  if (pomucky.length > 0) {
    xml += `      <div class="subhead">Pomůcky:</div>\n      <ul class="pomucky">\n`;
    pomucky.forEach(item => xml += `        <li>${stripParagraphs(item)}</li>\n`);
    xml += `      </ul>\n`;
  }

  xml += `    </div>\n  </studijní-literatura>\n`;
  xml += `</předmět>`;
  return formatXml(xml);
}


function downloadXML() {
  const predmetId = document.getElementById("predmetId").value;
  const prettyXml = buildXML();
  const blob = new Blob([prettyXml], { type: "application/xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${predmetId}.xml`;
  a.click();
}
