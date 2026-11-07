(() => {
  const footer =
    document.querySelector("footer") || document.querySelector(".footer");
  if (!footer) return console.warn("Footer element not found on page.");

  const fr = footer.getBoundingClientRect();
  console.log("Footer rect:", fr);

  const elems = Array.from(document.querySelectorAll("*")).map((el) => {
    const cs = getComputedStyle(el);
    const pos = cs.position || "";
    const vis =
      cs.display !== "none" &&
      cs.visibility !== "hidden" &&
      el.offsetWidth > 0 &&
      el.offsetHeight > 0;
    const z = parseInt(cs.zIndex, 10);
    const rect = el.getBoundingClientRect();
    const intersects = !(
      rect.bottom < fr.top ||
      rect.top > fr.bottom ||
      rect.right < fr.left ||
      rect.left > fr.right
    );
    return {
      el,
      tag: el.tagName.toLowerCase(),
      cls: el.className,
      id: el.id,
      pos,
      z: isNaN(z) ? 0 : z,
      vis,
      rect,
      intersects,
    };
  });

  const overlappers = elems
    .filter(
      (e) =>
        e.el !== footer &&
        e.vis &&
        (e.pos === "fixed" || e.pos === "sticky" || e.pos === "absolute") &&
        e.intersects
    )
    .sort((a, b) => b.z - a.z);

  if (!overlappers.length)
    console.log(
      "No visible fixed/sticky/absolute elements overlapping the footer."
    );
  else {
    console.warn("Overlapping elements (top -> bottom by z-index):");
    overlappers.forEach((o) => {
      console.log(
        {
          tag: o.tag,
          id: o.id || null,
          class: o.cls || null,
          position: o.pos,
          zIndex: o.z,
          rect: o.rect,
        },
        o.el
      );
    });
  }

  // Ancestor overflow check
  let anc = footer.parentElement;
  while (anc) {
    const cs = getComputedStyle(anc);
    if (/(hidden|clip)/.test(cs.overflow + cs.overflowY + cs.overflowX)) {
      console.warn(
        "Ancestor with overflow that may clip footer:",
        {
          tag: anc.tagName.toLowerCase(),
          id: anc.id,
          class: anc.className,
          overflow: {
            overflow: cs.overflow,
            overflowX: cs.overflowX,
            overflowY: cs.overflowY,
          },
        },
        anc
      );
    }
    anc = anc.parentElement;
  }

  // Finally show computed style for footer
  console.log("Footer computed style:", getComputedStyle(footer));
})();
