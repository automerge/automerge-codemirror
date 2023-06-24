import React from "react"
import { Editor } from "./Editor"
import { unstable as automerge } from "@automerge/automerge"
import { DocHandle } from "./DocHandle"
import { mount } from "@cypress/react18"

describe("<Editor />", () => {
  it("renders", () => {
    const doc = automerge.from({ text: "Hello World" })
    const handle = new DocHandle(doc)
    mount(<Editor handle={handle} path={["text"]} />)
    cy.get("div.cm-content").should("have.html", expectedHtml(["Hello World"]))
  })

  it("renders multiple lines", () => {
    const doc = automerge.from({ text: "Hello World\nGoodbye World" })
    const handle = new DocHandle(doc)
    mount(<Editor handle={handle} path={["text"]} />)
    cy.get("div.cm-content").should(
      "have.html",
      expectedHtml(["Hello World", "Goodbye World"])
    )
  })

  describe("local edits", () => {
    it("handles local inserts", () => {
      const doc = automerge.from({ text: "Hello World" })
      const handle = new DocHandle(doc)
      mount(<Editor handle={handle} path={["text"]} />)
      cy.get("div.cm-content").type("!")
      cy.get("div.cm-content").should(
        "have.html",
        expectedHtml(["Hello World!"])
      )
      cy.wait(100).then(() => {
        assert.equal(handle.doc.text.toString(), "Hello World!")
      })
    })

    it("allows inserting multiple blank lines", () => {
      const doc = automerge.from({ text: "Hello World!" })
      const handle = new DocHandle(doc)
      mount(<Editor handle={handle} path={["text"]} />)
      cy.get("div.cm-content").type(
        "{enter}{enter}{backspace}{enter}The ultimate line"
      )
      cy.get("div.cm-content").should(
        "have.html",
        expectedHtml(["Hello World!", "", "The ultimate line"], 2)
      )
      cy.wait(100).then(() => {
        assert.equal(
          handle.doc.text.toString(),
          "Hello World!\n\nThe ultimate line"
        )
      })
    })
  })

  describe("remote changes", () => {
    it("should incorporate inserts from remotes", () => {
      const doc = automerge.from({ text: "Hello World!" })
      const handle = new DocHandle(doc)
      mount(<Editor handle={handle} path={["text"]} />)
      cy.wait(100)
        .then(() => {
          handle.change(d => {
            automerge.splice(d, ["text"], 5, 0, " Happy")
          })
        })
        .then(() => {
          cy.get("div.cm-content").should(
            "have.html",
            expectedHtml(["Hello Happy World!"])
          )
        })
    })

    it("handles simultaneous remote and local changes", () => {
      const doc = automerge.from({ text: "Hello World!" })
      const handle = new DocHandle(doc)
      mount(<Editor handle={handle} path={["text"]} />)
      cy.wait(100)
        .then(() => {
          handle.change(d => {
            automerge.splice(d, ["text"], 5, 0, " Happy")
          })
        })
        .then(() => {
          cy.get("div.cm-content").should(
            "have.html",
            expectedHtml(["Hello Happy World!"])
          )
        })
        .then(() => {
          cy.get("div.cm-content").type("!")
        })
        .then(() => {
          cy.get("div.cm-content").should(
            "have.html",
            expectedHtml(["Hello Happy World!!"])
          )
        })
    })
  })
})

function expectedHtml(lines: string[], activeIndex = 0): string {
  return lines
    .map((line, index) => {
      const active = index === activeIndex ? "cm-activeLine " : ""
      let lineHtml = line
      if (lineHtml === "") {
        lineHtml = "<br>"
      }
      return `<div class="${active}cm-line">${lineHtml}</div>`
    })
    .join("")
}
