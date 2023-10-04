import React from "react"
import { Editor } from "./Editor"
import { next as automerge } from "@automerge/automerge"
import { Repo } from "@automerge/automerge-repo"
import { mount } from "@cypress/react18"

type TextDoc = { text: string }

const makeHandle = (text: string) => {
  const repo = new Repo({
    network: [],
  })

  const handle = repo.create<TextDoc>()
  handle.change(d => {
    d.text = text
  })

  return { handle, repo }
}

describe("<Editor />", () => {
  it("renders", () => {
    const { handle } = makeHandle("Hello World")
    mount(<Editor handle={handle} path={["text"]} />)
    cy.get("div.cm-content").should("have.html", expectedHtml(["Hello World"]))
  })

  it("renders multiple lines", () => {
    const { handle } = makeHandle("Hello World\nGoodbye World")
    mount(<Editor handle={handle} path={["text"]} />)
    cy.get("div.cm-content").should(
      "have.html",
      expectedHtml(["Hello World", "Goodbye World"])
    )
  })

  describe("local edits", () => {
    it("handles local inserts", () => {
      const { handle } = makeHandle("Hello World")
      mount(<Editor handle={handle} path={["text"]} />)
      cy.get("div.cm-content").type("!")
      cy.get("div.cm-content").should(
        "have.html",
        expectedHtml(["Hello World!"])
      )
      cy.wait(100).then(async () => {
        const doc = await handle.doc()
        assert.equal(doc.text, "Hello World!")
      })
    })

    it("allows inserting multiple blank lines", () => {
      const { handle } = makeHandle("Hello World!")
      mount(<Editor handle={handle} path={["text"]} />)

      cy.wait(1000).then(() => {
        cy.get("div.cm-content").type("{enter}{enter}{backspace}{enter}.")

        cy.wait(100).then(async () => {
          const doc = await handle.doc()
          assert.equal(doc.text, "Hello World!\n\n.")
          cy.get("div.cm-content").should(
            "have.html",
            expectedHtml(["Hello World!", "", "."], 2)
          )
        })
      })
    })
  })

  describe("remote changes", () => {
    it("should incorporate inserts from remotes", () => {
      const { handle } = makeHandle("Hello World!")
      mount(<Editor handle={handle} path={["text"]} />)
      cy.wait(100)
        .then(() => {
          handle.change(d => {
            automerge.splice(d, ["text"], 5, 0, " Happy")
          })
        })
        .then(async () => {
          cy.get("div.cm-content").should(
            "have.html",
            expectedHtml(["Hello Happy World!"])
          )
        })
    })

    it("handles simultaneous remote and local changes", () => {
      const { handle, repo } = makeHandle("Hello World!")
      mount(<Editor handle={handle} path={["text"]} />)

      // Create a local change
      cy.get("div.cm-content")
        .type("!")
        .then(() => {
          cy.get("div.cm-content").should(
            "have.html",
            expectedHtml(["Hello World!!"])
          )
        })

      let branch
      // create a remote change then merge it in
      cy.wait(100)
        .then(async () => {
          branch = repo.clone(handle)
          branch.change(d => {
            automerge.splice(d, ["text"], 5, 0, " Happy")
          })
          handle.merge(branch)
        })
        .wait(100)
        .then(() => {
          cy.get("div.cm-content").should(
            "have.html",
            expectedHtml(["Hello Happy World!!"])
          )
        })

      // Now create another remote change and receive that
      cy.wait(100)
        .then(() => {
          branch.change(branch, d => {
            automerge.splice(d, ["text"], 5, 0, " hello")
          })
          handle.merge(branch)
        })
        .then(() => {
          cy.get("div.cm-content").should(
            "have.html",
            expectedHtml(["Hello hello Happy World!!"])
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
