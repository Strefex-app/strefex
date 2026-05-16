export function mergeOverlayParts(sections, ...questionParts) {
  return {
    sections,
    questions: Object.assign({}, ...questionParts),
  }
}
