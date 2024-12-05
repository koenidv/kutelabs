/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * A challenge along the kutelabs learning journey
 */
export interface Challenge {
  section: {
    /**
     * The title of the section
     */
    title: string
    /**
     * The description of the section
     */
    description?: string
    /**
     * Hide the section head
     */
    hideSectionHead?: boolean
  }
  story: {
    /**
     * The title of the story
     */
    title: string
    /**
     * The description of the story
     */
    description?: string
    /**
     * The date and time the story was published. When unset or in the future, the story is not published
     */
    published: string
    /**
     * Hex color for the story box
     */
    color?: string
    imageStart?: Image
    imageEnd?: Image
  }
  editor: MixedContentEditorConfiguration | TextEditorConfiguration
  [k: string]: unknown
}