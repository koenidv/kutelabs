/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * A section of the kutelabs learning journey
 */
export interface Section {
  /**
   * The order of this section in the parent course
   */
  order: number
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
  [k: string]: unknown
}
