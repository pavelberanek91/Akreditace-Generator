let editorForma, editorTemata, editorMetody;
let editorPovinna, editorDoporucena, editorPomucky;

const editors = {}; // jen pro ranges (popisy)


// Inicializace hlavních editorů
// Hlavní editory
createCleanEditor('#forma', e => editorForma = e);
createCleanEditor('#temata', e => editorTemata = e);
createCleanEditor('#metody', e => editorMetody = e);

// Literatura + pomůcky
createCleanEditor('#literaturaPovinna', e => editorPovinna = e);
createCleanEditor('#literaturaDoporucena', e => editorDoporucena = e);
createCleanEditor('#pomucky', e => editorPomucky = e);

function createCleanEditor(selector, assignFn) {
  ClassicEditor
    .create(document.querySelector(selector), {
      toolbar: [
        'bold', 'italic', 'link', '|',
        'bulletedList', 'numberedList', '|',
        'undo', 'redo'
      ],
      removePlugins: [
  'Image', 'ImageUpload', 'EasyImage',
  'CKFinder', 'CKFinderUploadAdapter',
  'MediaEmbed', 'Table', 'BlockQuote', 'Heading', 'CodeBlock'
],

      htmlSupport: {
        allow: [
          { name: /.*/, attributes: true, classes: true, styles: false }
        ],
        disallow: [
          { name: /^(?!p|ul|ol|li|em|strong|a|dl|dt|dd|div)$/i }
        ]
      },
      link: {
        decorators: {
          openInNewTab: {
            mode: 'manual',
            label: 'Otevřít v novém okně',
            attributes: { target: '_blank', rel: 'noopener noreferrer' }
          }
        }
      }
    })
    .then(editor => assignFn(editor))
    .catch(error => console.error(error));
}
  

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

  createCleanEditor(`#range_${rangeCounter}_desc`, e => { 
  editors[`range_${rangeCounter}_desc`] = e; 
});
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

// Parse "label" na { from, to }, povolí číslo ("5") nebo rozsah ("2-3"/"2–3"/"2—3").
// Odstraní mezery a normalizuje pomlčky na '-'.
function parseRangeLabel(label) {
  const norm = label.trim().replace(/\s+/g, '').replace(/[–—]/g, '-');
  if (/^\d+$/.test(norm)) {
    const n = parseInt(norm, 10);
    return { from: n, to: n, normalized: norm };
  }
  const m = norm.match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  return { from: a, to: b, normalized: norm };
}

function clearFieldErrors() {
  document.querySelectorAll(".is-invalid").forEach(el => {
    el.classList.remove("is-invalid");
  });
  document.querySelectorAll(".invalid-feedback").forEach(el => el.remove());
}

function setFieldError(element, message) {
  if (!element) return;
  element.classList.add("is-invalid");

  // vloží chybovou hlášku, pokud tam ještě není
  if (!element.nextElementSibling || !element.nextElementSibling.classList.contains("invalid-feedback")) {
    const feedback = document.createElement("div");
    feedback.className = "invalid-feedback";
    feedback.innerText = message;
    element.parentNode.appendChild(feedback);
  }
}

function validateForm() {
  clearFieldErrors();
  let errors = [];

  // Povinné sekce
  if (!editorForma.getData().trim()) {
    errors.push("Vyplňte prosím pole 'Forma ověření'.");
    setFieldError(document.querySelector("#forma"), "Pole je povinné.");
  }
  if (!editorTemata.getData().trim()) {
    errors.push("Vyplňte prosím pole 'Úvodní text k hlavním tématům'.");
    setFieldError(document.querySelector("#temata"), "Pole je povinné.");
  }

  // --- Rozsahy (validace obsahu, formátu, pořadí, návaznosti) ---
  const ranges = collectRanges();
  const totalRanges = document.querySelectorAll("#ranges > div").length;
  if (totalRanges > 0 && ranges.length < totalRanges) {
    errors.push("Vyplňte prosím všechny rozsahy témat (číslo i popis).");
  }

  // Musí existovat alespoň jeden rozsah hodin
  if (ranges.length === 0) {
    errors.push("Sylabus musí obsahovat alespoň jednu hodinu (rozsah).");
    const container = document.getElementById("ranges");
    setFieldError(container, "Přidejte prosím alespoň jednu hodinu do sylabu.");
  }

  // Zparsované rozsahy v pořadí, jak byly zadány
  const parsed = [];
  for (let i = 1; i <= rangeCounter; i++) {
    const labelEl = document.getElementById(`range_${i}_label`);
    const editorId = `range_${i}_desc`;
    if (!labelEl) continue;

    const rawLabel = labelEl.value.trim();
    const parsedItem = rawLabel ? parseRangeLabel(rawLabel) : null;

    // prázdný
    if (!rawLabel) {
      errors.push("Rozsah nesmí být prázdný.");
      setFieldError(labelEl, "Vyplňte rozsah.");
      continue;
    }

    // neplatný formát
    if (!parsedItem) {
      errors.push(`Rozsah "${rawLabel}" má neplatný formát. Použijte číslo nebo od–do (např. 3–5).`);
      setFieldError(labelEl, "Použijte číslo nebo od–do (např. 3–5).");
      continue;
    }

    // začátek <= konec (stoupající uvnitř rozsahu)
    if (parsedItem.from > parsedItem.to) {
      errors.push(`Rozsah "${rawLabel}" je neplatný: začátek nesmí být větší než konec (např. 7–9, ne 9–7).`);
      setFieldError(labelEl, "Začátek nesmí být větší než konec.");
      continue;
    }

    // popis nesmí být prázdný
    if (editors[editorId]) {
      const desc = editors[editorId].getData().trim();
      if (!desc) {
        errors.push(`Popis k rozsahu "${rawLabel}" nesmí být prázdný.`);
        setFieldError(document.querySelector(`#${editorId}`), "Vyplňte popis.");
      }
    }

    parsed.push({ index: i, el: labelEl, label: rawLabel, from: parsedItem.from, to: parsedItem.to, norm: parsedItem.normalized });
  }

  // kontrola začátku od 1
  if (ranges.length > 0) {
    const firstLabel = ranges[0].label;
    const parts = firstLabel.split(/[-–—]/).map(p => parseInt(p.trim(), 10));
    if (parts[0] !== 1) {
      errors.push("První rozsah musí začínat číslem 1.");
      const firstInput = document.getElementById("range_1_label");
      setFieldError(firstInput, "První rozsah musí začínat číslem 1.");
    }
  }

  // duplicity (podle normalizovaného labelu)
  const labelsNorm = parsed.map(p => p.norm);
  const duplicates = labelsNorm.filter((v, idx) => labelsNorm.indexOf(v) !== idx);
  if (duplicates.length > 0) {
    const dupSet = new Set(duplicates);
    errors.push("Rozsahy obsahují duplicity: " + [...dupSet].join(", "));
    parsed.forEach(p => {
      if (dupSet.has(p.norm)) setFieldError(p.el, "Duplicitní rozsah.");
    });
  }

  // pořadí + návaznost (kontrolujeme v zadaném pořadí, nepřetřiďujeme!)
  if (parsed.length > 0) {
    let prevTo = parsed[0].to;
    for (let k = 1; k < parsed.length; k++) {
      const cur = parsed[k];
      const expectedStart = prevTo + 1;

      if (cur.from < expectedStart) {
        // není stoupající (nebo překryv)
        errors.push(`Rozsah "${cur.label}" není ve stoupajícím pořadí nebo se překrývá s předchozím (očekáván začátek alespoň ${expectedStart}).`);
        setFieldError(cur.el, "Rozsah musí být ve stoupajícím pořadí a nesmí se překrývat.");
      } else if (cur.from > expectedStart) {
        // chybí návaznost (mezera)
        errors.push(`Rozsahy na sebe nenavazují: po ${prevTo} očekáván začátek ${expectedStart}, ale je "${cur.label}".`);
        setFieldError(cur.el, `Rozsah musí navazovat (očekáván začátek ${expectedStart}).`);
      }

      prevTo = cur.to;
    }
  }
  // --- konec validace rozsahů ---

  // Literatura
  if (!editorPovinna.getData().trim()) {
    errors.push("Vyplňte prosím 'Povinnou literaturu'.");
    setFieldError(document.querySelector("#literaturaPovinna"), "Pole je povinné.");
  }

  return errors;
}
