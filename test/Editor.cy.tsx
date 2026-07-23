import React from "react"
import { Editor } from "./Editor.js"
import * as automerge from "@automerge/automerge"
import { DocHandle, Repo } from "@automerge/automerge-repo"
import { mount } from "cypress/react"

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

describe("<Editor />", () => {
  it("renders", () => {
    const { handle } = makeHandle("Hello World")
    mount(<Editor handle={handle} />)
    assertContent(["Hello World"])
  })

  it("renders multiple lines", () => {
    const { handle } = makeHandle("Hello World\nGoodbye World")
    mount(<Editor handle={handle} />)
    assertContent(["Hello World", "Goodbye World"])
  })

  describe("local edits", () => {
    it("handles local inserts", () => {
      const { handle } = makeHandle("Hello World")
      mount(<Editor handle={handle} />)
      assertContent(["Hello World"])

      cy.get("div.cm-content").type("!")
      assertContent(["Hello World!"])
      cy.wait(0).then(() => {
        const doc = handle.doc()
        assert.equal(doc.text, "Hello World!")
      })
    })

    it("allows inserting multiple blank lines", () => {
      const { handle } = makeHandle("Hello World!")
      mount(<Editor handle={handle} />)

      cy.wait(0).then(() => {
        cy.get("div.cm-content").type("{enter}{enter}{backspace}{enter}.")

        cy.wait(0).then(() => {
          const doc = handle.doc()
          assert.equal(doc.text, "Hello World!\n\n.")
          assertContent(["Hello World!", "", "."], 2)
        })
      })
    })

    it("handles inserting when the initial document is blank", () => {
      const { handle } = makeHandle("")
      mount(<Editor handle={handle} />)
      cy.get("div.cm-content").type("{backspace}Hello")
      assertContent(["Hello"])
      cy.wait(0).then(() => {
        const doc = handle.doc()
        assert.equal(doc.text, "Hello")
      })
    })

    it("handles moving lines", () => {
      const { handle } = makeHandle("Hello\nWorld")
      mount(<Editor handle={handle} />)
      cy.get("div.cm-content").focus().type("{alt+downArrow}")
      assertContent(["World", "Hello"], 1)
      cy.wait(0).then(() => {
        const doc = handle.doc()
        assert.equal(doc.text, "World\nHello")
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
      assertContent(["ello Lines", "orld Lines", "here! Lines"], 0)
      cy.wait(0).then(() => {
        const doc = handle.doc()
        assert.equal(doc.text, "ello Lines\norld Lines\nhere! Lines")
      })
    })
  })

  describe("remote changes", () => {
    it("should incorporate inserts from remotes", () => {
      const { handle } = makeHandle("Hello World!")
      mount(<Editor handle={handle} />)
      cy.wait(0)
        .then(() => {
          handle.change(d => {
            automerge.splice(d, ["text"], 5, 0, " Happy")
          })
        })
        .then(async () => {
          assertContent(["Hello Happy World!"])
        })
    })

    it("handles simultaneous remote and local changes", () => {
      const { handle, repo } = makeHandle("Hello World!")
      mount(<Editor handle={handle} />)

      // Create a local change
      cy.get("div.cm-content")
        .type("!")
        .then(() => {
          assertContent(["Hello World!!"])
        })

      let branch: DocHandle<TextDoc>
      // create a remote change then merge it in
      cy.wait(0)
        .then(() => {
          branch = repo.clone(handle)
          branch.change(d => {
            automerge.splice(d, ["text"], 5, 0, " Happy")
          })
          handle.merge(branch)
        })
        .wait(0)
        .then(() => {
          assertContent(["Hello Happy World!!"])
        })

      // Now create another remote change and receive that
      cy.wait(0)
        .then(() => {
          branch.change(d => {
            automerge.splice(d, ["text"], 5, 0, " hello")
          })
          handle.merge(branch)
        })
        .then(() => {
          assertContent(["Hello hello Happy World!!"])
        })
    })
  })

  describe("history", () => {
    it("should undo changes made through the editor", () => {
      const { handle } = makeHandle("Hello World!")
      mount(<Editor handle={handle} />)

      cy.wait(0).then(() => {
        cy.get("div.cm-content").click()
        cy.get("div.cm-content").type(" You there?")

        assertContent(["Hello World! You there?"])

        cy.wait(0).then(() => {
          const doc = handle.doc()
          assert.equal(doc.text, "Hello World! You there?")
        })

        triggerUndo()
        assertContent(["Hello World!"])

        cy.wait(0).then(() => {
          const doc = handle.doc()
          assert.equal(doc.text, "Hello World!")
        })
      })
    })

    it("should undo changes made through automerge", () => {
      const { handle } = makeHandle("Hello World!")
      mount(<Editor handle={handle} />)

      assertContent(["Hello World!"])

      cy.wait(0).then(() => {
        handle.change(d => {
          automerge.splice(d, ["text"], 5, 0, " Happy")
        })

        assertContent(["Hello Happy World!"])

        cy.wait(0).then(() => {
          const doc = handle.doc()
          assert.equal(doc.text, "Hello Happy World!")
        })

        triggerUndo()
        assertContent(["Hello World!"])

        cy.wait(0).then(() => {
          const doc = handle.doc()
          assert.equal(doc.text, "Hello World!")
        })
      })
    })

    it("should redo undone changes", () => {
      const { handle } = makeHandle("Hello World!")
      mount(<Editor handle={handle} />)

      cy.wait(0).then(() => {
        cy.get("div.cm-content").click()
        cy.get("div.cm-content").type(" You there?")

        assertContent(["Hello World! You there?"])
        cy.wait(0).then(() => {
          const doc = handle.doc()
          assert.equal(doc.text, "Hello World! You there?")
        })

        triggerUndo()

        assertContent(["Hello World!"])
        cy.wait(0).then(() => {
          const doc = handle.doc()
          assert.equal(doc.text, "Hello World!")
        })

        triggerRedo()

        assertContent(["Hello World! You there?"])
        cy.wait(0).then(() => {
          const doc = handle.doc()
          assert.equal(doc.text, "Hello World! You there?")
        })
      })
    })

    it("should redo/undo multiple changes", () => {
      const { handle } = makeHandle("")
      mount(<Editor handle={handle} />)

      cy.wait(0).then(() => {
        cy.get("div.cm-content").click()
        cy.get("div.cm-content").type("You there?\nIn the mirror\nlooking back")

        assertContent(["You there?", "In the mirror", "looking back"], 2)
        cy.wait(0).then(() => {
          const doc = handle.doc()
          assert.equal(doc.text, "You there?\nIn the mirror\nlooking back")
        })

        triggerUndo()

        assertContent(["You there?", "In the mirror"], 1)
        cy.wait(0).then(() => {
          const doc = handle.doc()
          assert.equal(doc.text, "You there?\nIn the mirror")
        })

        triggerUndo()

        assertContent(["You there?"])
        cy.wait(0).then(() => {
          const doc = handle.doc()
          assert.equal(doc.text, "You there?")
        })

        triggerUndo()

        assertContent([""])
        cy.wait(0).then(() => {
          const doc = handle.doc()
          assert.equal(doc.text, "")
        })

        triggerRedo()

        assertContent(["You there?"])
        cy.wait(0).then(() => {
          const doc = handle.doc()
          assert.equal(doc.text, "You there?")
        })

        triggerRedo()

        assertContent(["You there?", "In the mirror"], 1)
        cy.wait(0).then(() => {
          const doc = handle.doc()
          assert.equal(doc.text, "You there?\nIn the mirror")
        })

        cy.get("div.cm-content").type("!")

        assertContent(["You there?!", "In the mirror"], 0)
        cy.wait(0).then(() => {
          const doc = handle.doc()
          assert.equal(doc.text, "You there?!\nIn the mirror")
        })

        triggerRedo()

        assertContent(["You there?!", "In the mirror"], 0)
        cy.wait(0).then(() => {
          const doc = handle.doc()
          assert.equal(doc.text, "You there?!\nIn the mirror")
        })
      })
    })
  })
})

// Assert editor lines and active line index by text content.
function assertContent(lines: string[], activeIndex = 0) {
  cy.get("div.cm-content").should($content => {
    const lineEls = $content.find(".cm-line")
    expect(lineEls, "line count").to.have.length(lines.length)
    lineEls.each((index, el) => {
      expect(el.textContent, `line ${index} text`).to.equal(lines[index])
      expect(
        el.classList.contains("cm-activeLine"),
        `line ${index} active state`
      ).to.equal(index === activeIndex)
    })
  })
}

// We are using buttons to trigger undo and redo instead of keyboard shortcuts
// because the undo/redo keyboard shortcuts have inconsistent behaviour across platforms

function triggerUndo() {
  cy.get("button#undo").click()
}

function triggerRedo() {
  cy.get("button#redo").click()
}
