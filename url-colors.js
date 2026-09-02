/**
 * Apply valid color query parameters to the contrast tool controls.
 * Invalid or absent parameters leave the existing control values unchanged.
 */
export function applyColorsFromURL({
  search,
  parseColor,
  fgText,
  fgPicker,
  bgText,
  bgPicker,
  thirdText,
  thirdPicker,
  enableThird,
  thirdContainer,
}) {
  const params = new URLSearchParams(search);

  function applyColor(paramName, textInput, picker) {
    const value = params.get(paramName);
    if (!value) return false;

    try {
      const parsed = parseColor(value);
      textInput.value = parsed.hex;
      picker.value = parsed.hex;
      return true;
    } catch {
      return false;
    }
  }

  applyColor('fg', fgText, fgPicker);
  applyColor('bg', bgText, bgPicker);

  if (applyColor('third', thirdText, thirdPicker)) {
    enableThird.checked = true;
    thirdContainer.classList.remove('hidden');
  }
}
