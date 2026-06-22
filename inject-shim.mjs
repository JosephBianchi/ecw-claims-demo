// Inject a minimal offline "make claim links markable" shim into the faithful
// ECW clone (ecw-claims.html). Idempotent: strips any prior injected block first.
//
// Why: the clone already wires each claim number to <a href="ecw-claim-N.html">
// (navigation works offline). But the VISIBLE claim number is a generic <span>
// sitting on top of the anchor, so Magical's set-of-marks sees a non-interactive
// top element and assigns NO marker -> the agent reports "no marker" and can't
// click. This shim marks the claim anchors AND their inner leaves as role=link so
// the top element at the claim number is interactive -> gets a set-of-marks marker.
// Navigation is left to the existing <a href>, so the faithful detail page opens.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, 'ecw-claims.html');
const START = '<!-- GM-CLAIM-SHIM-START -->';
const END = '<!-- GM-CLAIM-SHIM-END -->';

const shim = `${START}
<script id="gm-shim-script">
(function(){
  function enhance(){
    // Claim-number cells render as a generic <span> on top of the row's ng-click
    // handler, so set-of-marks sees a non-interactive top element. Mark every
    // 7-digit leaf inside a table cell as role=link so it becomes markable; the
    // existing ng-click still fires on click and navigates to the detail page.
    var cells = document.querySelectorAll('td');
    for (var i=0;i<cells.length;i++){
      var candidates = [cells[i]].concat(Array.prototype.slice.call(cells[i].querySelectorAll('*')));
      for (var j=0;j<candidates.length;j++){
        var n = candidates[j];
        if (n.children.length) continue; // leaf only
        var t = (n.textContent || '').trim();
        if (/^\\d{7}$/.test(t)){
          if (!n.getAttribute('role')) n.setAttribute('role','link');
          if (n.getAttribute('tabindex') === null) n.setAttribute('tabindex','0');
          n.style.cursor = 'pointer';
        }
      }
    }
  }
  // Angular renders the grid async; retry wiring for ~10s, then stop.
  var tries=0; var iv=setInterval(function(){ enhance(); if(++tries>25) clearInterval(iv); }, 400);
  if (document.readyState !== 'loading') enhance(); else window.addEventListener('load', enhance);
})();
</script>
${END}`;

let html = readFileSync(FILE, 'utf8');
const s = html.indexOf(START), e = html.indexOf(END);
if (s !== -1 && e !== -1) html = html.slice(0, s) + html.slice(e + END.length);
const bodyIdx = html.lastIndexOf('</body>');
html = bodyIdx !== -1 ? html.slice(0, bodyIdx) + shim + '\n' + html.slice(bodyIdx) : html + shim;
writeFileSync(FILE, html);
console.log('injected minimal markability shim (', html.length, 'bytes ); targets a[href*="ecw-claim"]');
