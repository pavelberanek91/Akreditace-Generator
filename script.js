let editorForma, editorTemata, editorMetody;
let editorPovinna, editorDoporucena, editorPomucky;

const editors = {}; // jen pro ranges (popisy)


// Inicializace hlavních editorů
ClassicEditor.create(document.querySelector('#forma'))
  .then(editor => editorForma = editor);
ClassicEditor.create(document.querySelector('#temata'))
  .then(editor => editorTemata = editor);
ClassicEditor.create(document.querySelector('#metody'))
  .then(editor => editorMetody = editor);

ClassicEditor.create(document.querySelector('#literaturaPovinna'))
  .then(editor => editorPovinna = editor);
ClassicEditor.create(document.querySelector('#literaturaDoporucena'))
  .then(editor => editorDoporucena = editor);
ClassicEditor.create(document.querySelector('#pomucky'))
  .then(editor => editorPomucky = editor);


// ---------- Rozsahy témat ----------
let rangeCounter = 0;
function addRange() {
  rangeCounter++;
  const container = document.getElementById("ranges");
  const wrapper = document.createElement("div");
  wrapper.classList.add("mb-3", "border", "p-2", "rounded");
  wrapper.innerHTML = `
    <label>Rozsah (např. 2–3)</label>
    <input type="text" class="form-control mb-2" id="range_${rangeCounter}_label" placeholder="např. 2–3">

    <label>Popis</label>
    <div id="range_${rangeCounter}_desc" class="editor"></div>

    <button class="btn btn-sm btn-outline-danger mt-2" type="button" onclick="removeRange('range_${rangeCounter}', this)">Odstranit rozsah</button>
  `;
  container.appendChild(wrapper);

  ClassicEditor.create(document.querySelector(`#range_${rangeCounter}_desc`))
    .then(editor => { editors[`range_${rangeCounter}_desc`] = editor; });
}

function removeRange(rangeId, btn) {
  const editorId = `${rangeId}_desc`;
  if (editors[editorId]) {
    editors[editorId].destroy().then(() => {
      delete editors[editorId];
      btn.parentNode.remove();
    });
  }
}

function collectRanges() {
  const results = [];
  for (let i = 1; i <= rangeCounter; i++) {
    const labelEl = document.getElementById(`range_${i}_label`);
    const editorId = `range_${i}_desc`;
    if (labelEl && editors[editorId]) {
      const label = labelEl.value.trim();
      const desc = editors[editorId].getData().trim();
      if (label && desc) {
        results.push({ label, desc });
      }
    }
  }
  return results;
}
// ----------------------------------


function stripParagraphs(html) {
  return html
    .replace(/<p>(.*?)<\/p>/gi, '$1')
    .replace(/\s+/g, ' ')
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

  const ranges = collectRanges();

  const povinna = editorPovinna.getData();
  const doporucena = editorDoporucena.getData();
  const pomucky = editorPomucky.getData();

  let xml = `<předmět id="${predmetId}" xmlns="http://ki.ujep.cz/ns/akreditace">\n`;

  xml += `  <forma-ověření>\n    <div xmlns="http://www.w3.org/1999/xhtml">\n${stripParagraphs(forma)}\n    </div>\n  </forma-ověření>\n`;

  xml += `  <hlavní-témata>\n    <div xmlns="http://www.w3.org/1999/xhtml">\n${temata}\n`;

  if (ranges.length > 0) {
    xml += `      <dl class="ranges">\n`;
    ranges.forEach(r => {
      xml += `        <dt>${r.label}</dt><dd>${stripParagraphs(r.desc)}</dd>\n`;
    });
    xml += `      </dl>\n`;
  }

  xml += `    </div>\n  </hlavní-témata>\n`;

  xml += `  <metody-výuky>\n    <div xmlns="http://www.w3.org/1999/xhtml">\n${metody}\n    </div>\n  </metody-výuky>\n`;

  xml += `  <studijní-literatura>\n    <div xmlns="http://www.w3.org/1999/xhtml">\n`;

  if (povinna.trim()) {
    xml += `      <div class="subhead">Povinná:</div>\n      <div class="bibliography">\n${povinna}\n      </div>\n`;
  }
  if (doporucena.trim()) {
    xml += `      <div class="subhead">Doporučená:</div>\n      <div class="bibliography">\n${doporucena}\n      </div>\n`;
  }
  if (pomucky.trim()) {
    xml += `      <div class="subhead">Pomůcky:</div>\n      ${pomucky}\n      `;
  }

  xml += `    </div>\n  </studijní-literatura>\n`;
  xml += `</předmět>`;
  return formatXml(xml);
}


function downloadXML() {
  const errors = validateForm();
  if (errors.length > 0) {
    alert("Formulář obsahuje chyby:\n\n" + errors.join("\n"));
    return; // zastaví export
  }

  const predmetId = document.getElementById("predmetId").value;
  const prettyXml = buildXML();
  const blob = new Blob([prettyXml], { type: "application/xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${predmetId}.xml`;
  a.click();
}

function validateForm() {
  let errors = [];

  // Základní sekce
  if (!editorForma.getData().trim()) {
    errors.push("Vyplňte prosím pole 'Forma ověření'.");
  }
  if (!editorTemata.getData().trim()) {
    errors.push("Vyplňte prosím pole 'Úvodní text k hlavním tématům'.");
  }

  // Rozsahy
  const ranges = collectRanges();
  const totalRanges = document.querySelectorAll("#ranges > div").length;
  if (totalRanges > 0 && ranges.length < totalRanges) {
    errors.push("Vyplňte prosím všechny rozsahy témat (číslo i popis).");
  }

   // Kontrola duplicit
  const labels = ranges.map(r => r.label);
  const duplicates = labels.filter((item, idx) => labels.indexOf(item) !== idx);
  if (duplicates.length > 0) {
    errors.push("Rozsahy obsahují duplicity: " + [...new Set(duplicates)].join(", "));
  }

  // Kontrola formátu rozsahů
  const rangeRegex = /^([0-9]+|[0-9]+[\-–—][0-9]+)$/;
  labels.forEach(label => {
    if (!rangeRegex.test(label)) {
      errors.push(`Rozsah "${label}" má neplatný formát. Použijte číslo nebo formát od–do (např. 3–5).`);
    }
  });

  // Literatura – tady zatím jen kontrola, že něco je
  if (!editorPovinna.getData().trim()) {
    errors.push("Vyplňte prosím 'Povinnou literaturu'.");
  }

  return errors;
}


function createCleanEditor(selector, assignFn) {
  ClassicEditor
    .create(document.querySelector(selector), {
      htmlSupport: {
        allow: [
          {
            name: /.*/,         // povolíme všechny tagy…
            attributes: true,   // …ale
            classes: true,
            styles: false       // zakážeme inline styly
          }
        ],
        disallow: [
          {
            // nepovolíme tagy mimo whitelist (p, ul, ol, li, em, strong, a, dl, dt, dd, div)
            name: /^(?!p|ul|ol|li|em|strong|a|dl|dt|dd|div)$/i
          }
        ]
      },
      link: {
        decorators: {
          openInNewTab: {
            mode: 'manual',
            label: 'Otevřít v novém okně',
            attributes: {
              target: '_blank',
              rel: 'noopener noreferrer'
            }
          }
        }
      }
    })
    .then(editor => assignFn(editor))
    .catch(error => console.error(error));
}

// Promise s vytvořeným editorem pro automatickou tvorbu DD/DT prvků
function addRange() {
  return new Promise((resolve, reject) => {
    rangeCounter++;
    const container = document.getElementById("ranges");
    const wrapper = document.createElement("div");
    wrapper.classList.add("mb-3", "border", "p-2", "rounded");
    wrapper.innerHTML = `
      <label>Rozsah (např. 2–3)</label>
      <input type="text" class="form-control mb-2" id="range_${rangeCounter}_label" placeholder="např. 2–3">

      <label>Popis</label>
      <div id="range_${rangeCounter}_desc" class="editor"></div>

      <button class="btn btn-sm btn-outline-danger mt-2" type="button" onclick="removeRange('range_${rangeCounter}', this)">Odstranit rozsah</button>
    `;
    container.appendChild(wrapper);

    ClassicEditor.create(document.querySelector(`#range_${rangeCounter}_desc`))
      .then(editor => {
        editors[`range_${rangeCounter}_desc`] = editor;
        resolve({ id: rangeCounter, editor });
      })
      .catch(reject);
  });
}

async function parsePlainTextRanges() {
  const rawText = document.getElementById("rangesPaste").value;
  if (!rawText.trim()) {
    alert("Vložte prosím text k rozparsování.");
    return;
  }

  // 🧹 Vyčistit existující rozsahy
  const container = document.getElementById("ranges");
  container.innerHTML = "";
  rangeCounter = 0;
  for (const key in editors) {
    if (editors[key]) {
      await editors[key].destroy();
      delete editors[key];
    }
  }

  const lines = rawText.split(/\r?\n/);

  const regex = /^[\s•]*[\[\(\{]?\s*(\d+)\s*(?:[-–—]\s*(\d+))?\s*[\]\)\}]?[\.\):]?\s*(.*)$/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const from = match[1];
      const to = match[2];
      const desc = match[3].trim();

      // pokud interval (např. 2-3), jinak jen číslo
      const label = to ? `${from}-${to}` : from;

      const { id, editor } = await addRange();
      document.getElementById(`range_${id}_label`).value = label;
      editor.setData(desc);
    }
  }

  // volitelně vyčistit vstup
  // document.getElementById("rangesPaste").value = "";
}
