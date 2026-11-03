export function fallbackCopyTextToClipboard(text: string) {
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.top = '0'
  textArea.style.left = '0'
  textArea.style.position = 'fixed'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  try {
    document.execCommand('copy')
  } catch (err) {
    console.error('Unable to copy', err)
  }

  document.body.removeChild(textArea)
}

export function copyTextToClipboard(text: string) {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(text)
    return
  }

  // [sn-super-extended] Plugin iframes don't get the clipboard-write permission; fall back when it's denied.
  navigator.clipboard.writeText(text).catch(() => fallbackCopyTextToClipboard(text))
}
