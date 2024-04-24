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

const IS_MAC_OS = Cypress.platform === "darwin"

const WITH_COMMAND_KEY_PRESSED = IS_MAC_OS
  ? { cmdKey: true }
  : { ctrlKey: true }

const CMD = IS_MAC_OS ? "cmd" : "ctrl"

describe("<Editor />", () => {
  it("renders", () => {
    const { handle } = makeHandle("Hello World")
    mount(<Editor handle={handle} />)
    cy.get("div.cm-content").should("have.html", expectedHtml(["Hello World"]))
  })

  it("renders multiple lines", () => {
    const { handle } = makeHandle("Hello World\nGoodbye World")
    mount(<Editor handle={handle} />)
    cy.get("div.cm-content").should(
      "have.html",
      expectedHtml(["Hello World", "Goodbye World"])
    )
  })

  describe("local edits", () => {
    it("handles local inserts", () => {
      const { handle } = makeHandle("Hello World")
      mount(<Editor handle={handle} />)
      cy.get("div.cm-content").type("!")
      cy.get("div.cm-content").should(
        "have.html",
        expectedHtml(["Hello World!"])
      )
      cy.wait(100).then(async () => {
        const doc = await handle.doc()
        assert.equal(doc!.text, "Hello World!")
      })
    })

    it("allows inserting multiple blank lines", () => {
      const { handle } = makeHandle("Hello World!")
      mount(<Editor handle={handle} />)

      cy.wait(1000).then(() => {
        cy.get("div.cm-content").type("{enter}{enter}{backspace}{enter}.")

        cy.wait(100).then(async () => {
          const doc = await handle.doc()
          assert.equal(doc!.text, "Hello World!\n\n.")
          cy.get("div.cm-content").should(
            "have.html",
            expectedHtml(["Hello World!", "", "."], 2)
          )
        })
      })
    })

    it("handles inserting when the initial document is blank", () => {
      const { handle } = makeHandle("")
      mount(<Editor handle={handle} />)
      cy.get("div.cm-content").type("{backspace}Hello")
      cy.get("div.cm-content").should("have.html", expectedHtml(["Hello"]))
      cy.wait(100).then(async () => {
        const doc = await handle.doc()
        assert.equal(doc!.text, "Hello")
      })
    })

    it("handles moving lines", () => {
      const { handle } = makeHandle("Hello\nWorld")
      mount(<Editor handle={handle} />)
      cy.get("div.cm-content").type("{alt+downArrow}")
      cy.get("div.cm-content").should(
        "have.html",
        expectedHtml(["World", "Hello"], 1)
      )
      cy.wait(100).then(async () => {
        const doc = await handle.doc()
        assert.equal(doc!.text, "World\nHello")
      })
    })

    it("handles multiple cursors", () => {
      const { handle } = makeHandle("Hello\nWorld\nThere!")
      mount(<Editor handle={handle} />)
      cy.get("div.cm-content>.cm-line").eq(0).click()
      cy.get("div.cm-content>.cm-line").eq(1).click(WITH_COMMAND_KEY_PRESSED)
      cy.get("div.cm-content>.cm-line").eq(2).click(WITH_COMMAND_KEY_PRESSED)
      cy.get("div.cm-content").type(" Lines{home}{shift+rightArrow}{del}")
      cy.get("div.cm-content>.cm-line").eq(0).click()
      cy.get("div.cm-content").should(
        "have.html",
        expectedHtml(["ello Lines", "orld Lines", "here! Lines"], 0)
      )
      cy.wait(100).then(async () => {
        const doc = await handle.doc()
        assert.equal(doc!.text, "ello Lines\norld Lines\nhere! Lines")
      })
    })
  })

  describe("remote changes", () => {
    it("should incorporate inserts from remotes", () => {
      const { handle } = makeHandle("Hello World!")
      mount(<Editor handle={handle} />)
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
      mount(<Editor handle={handle} />)

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

  describe("history", () => {
    it("should undo changes made through the editor", () => {
      const { handle } = makeHandle("Hello World!")
      mount(<Editor handle={handle} />)

      cy.wait(100).then(() => {
        cy.get("div.cm-content").click()
        cy.get("div.cm-content").type(" You there?")

        cy.get("div.cm-content").should(
          "have.html",
          expectedHtml(["Hello World! You there?"])
        )

        cy.get("div.cm-content").type(`{${CMD}+z}`)

        cy.get("div.cm-content").should(
          "have.html",
          expectedHtml(["Hello World!"])
        )
      })
    })

    it("should undo changes made through automerge", () => {
      const { handle } = makeHandle("Hello World!")
      mount(<Editor handle={handle} />)

      cy.wait(100).then(() => {
        handle.change(d => {
          automerge.splice(d, ["text"], 5, 0, " Happy")
        })

        cy.get("div.cm-content").should(
          "have.html",
          expectedHtml(["Hello Happy World!"])
        )

        cy.get("div.cm-content").type(`{${CMD}+z}`)

        cy.get("div.cm-content").should(
          "have.html",
          expectedHtml(["Hello World!"])
        )
      })
    })

    it("should redo undone changes", () => {
      const { handle } = makeHandle("Hello World!")
      mount(<Editor handle={handle} />)

      cy.wait(100).then(() => {
        cy.get("div.cm-content").click()
        cy.get("div.cm-content").type(" You there?")

        cy.get("div.cm-content").should(
          "have.html",
          expectedHtml(["Hello World! You there?"])
        )

        cy.get("div.cm-content").type(`{${CMD}+z}`)

        cy.get("div.cm-content").should(
          "have.html",
          expectedHtml(["Hello World!"])
        )

        cy.get("div.cm-content").type(`{${CMD}+shift+z}`)

        cy.get("div.cm-content").should(
          "have.html",
          expectedHtml(["Hello World! You there?"])
        )
      })
    })

    it("should redo/undo multiple changes", () => {
      const { handle } = makeHandle("")
      mount(<Editor handle={handle} />)

      cy.wait(100).then(() => {
        cy.get("div.cm-content").click()
        cy.get("div.cm-content").type("You there?\nIn the mirror\nlooking back")

        cy.get("div.cm-content").should(
          "have.html",
          expectedHtml(["You there?", "In the mirror", "looking back"], 2)
        )

        cy.get("div.cm-content").type(`{${CMD}+z}`)
        cy.get("div.cm-content").should(
          "have.html",
          expectedHtml(["You there?", "In the mirror"], 1)
        )

        cy.get("div.cm-content").type(`{${CMD}+z}`)
        cy.get("div.cm-content").should(
          "have.html",
          expectedHtml(["You there?"])
        )

        cy.get("div.cm-content").type(`{${CMD}+z}`)
        cy.get("div.cm-content").should("have.html", expectedHtml([""]))

        cy.get("div.cm-content").type(`{${CMD}+shift+z}`)
        cy.get("div.cm-content").should(
          "have.html",
          expectedHtml(["You there?"])
        )

        cy.get("div.cm-content").type(`{${CMD}+shift+z}`)
        cy.get("div.cm-content").should(
          "have.html",
          expectedHtml(["You there?", "In the mirror"], 1)
        )

        /*
        cy.get("div.cm-content").type(" of code")
        cy.get("div.cm-content").should(
          "have.html",
          expectedHtml(["You there?", "In the mirror of code"], 1)
        )

        cy.get("div.cm-content").type(`{${CMD}+shift+z}`)
        cy.get("div.cm-content").should(
          "have.html",
          expectedHtml(["You there?", "In the mirror of code"], 1)
        )*/
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
