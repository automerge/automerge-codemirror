import React from 'react'
import {Editor} from './Editor'
import {unstable as automerge} from "@automerge/automerge"
import {DocHandle} from "./DocHandle"
import {mount} from "cypress/react18"

describe('<Editor />', () => {
  it('renders', () => {
    const doc = automerge.from({text: "Hello World"})
    const handle = new DocHandle(doc)
    mount(<Editor handle={handle} path={["text"]} />)
    cy.get("div.cm-content").should("have.html", expectedHtml(['Hello World']))
  })

  it("renders multiple lines", () => {
    const doc = automerge.from({text: "Hello World\nGoodbye World"})
    const handle = new DocHandle(doc)
    mount(<Editor handle={handle} path={["text"]} />)
    cy.get("div.cm-content").should("have.html", expectedHtml(["Hello world", "Goodbye World"]))
  })

  it("handles local inserts", () => {
    const doc = automerge.from({text: "Hello World"})
    const handle = new DocHandle(doc)
    mount(<Editor handle={handle} path={["text"]} />)
    cy.get("div.cm-content").type("!")
    cy.get("div.cm-content").should("have.html", '<div class="cm-activeLine cm-line">Hello World!</div>')
    cy.wait(100).then(() => {
      assert.equal(handle.doc.text.toString(), "Hello World!")
    })
  })

})

function expectedHtml(lines: string[], activeIndex: number = 0): string {
  return lines.map((line, index) => {
    const active = index === activeIndex ? "cm-activeLine " : ""
    return `<div class="${active}cm-line">${line}</div>`
  }).join("")
}
