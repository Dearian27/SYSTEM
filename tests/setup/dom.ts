declare global {
  interface HTMLElement {
    createEl<K extends keyof HTMLElementTagNameMap>(
      tagName: K,
      attrs?: { text?: string; type?: string; value?: string }
    ): HTMLElementTagNameMap[K];
    createDiv(): HTMLDivElement;
    setText(text: string): void;
    addClass(className: string): void;
    empty(): void;
  }
}

HTMLElement.prototype.createEl = function createEl(tagName, attrs = {}) {
  const element = document.createElement(tagName);

  if (attrs.text !== undefined) {
    element.textContent = attrs.text;
  }

  if (attrs.type !== undefined && "type" in element) {
    element.setAttribute("type", attrs.type);
  }

  if (attrs.value !== undefined && "value" in element) {
    (element as HTMLInputElement | HTMLOptionElement).value = attrs.value;
  }

  this.appendChild(element);
  return element;
};

HTMLElement.prototype.createDiv = function createDiv() {
  const element = document.createElement("div");
  this.appendChild(element);
  return element;
};

HTMLElement.prototype.setText = function setText(text: string) {
  this.textContent = text;
};

HTMLElement.prototype.addClass = function addClass(className: string) {
  this.classList.add(className);
};

HTMLElement.prototype.empty = function empty() {
  this.replaceChildren();
};

export {};
