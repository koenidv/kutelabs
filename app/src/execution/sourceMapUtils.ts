import { SourceMapConsumer, SourceMapGenerator } from "source-map-js"

export function mergeSourceMaps(
  existingGenerator: SourceMapGenerator,
  mergeGenerator: SourceMapGenerator
): SourceMapGenerator {
  const existing = new SourceMapConsumer(existingGenerator.toJSON())
  const merge = new SourceMapConsumer(mergeGenerator.toJSON())

  const generator = new SourceMapGenerator()

  merge.eachMapping(mapping => {
    if (!mapping.source || mapping.originalLine === null || mapping.originalColumn === null) {
      console.error("[Merge Source Maps] Invalid mapping", mapping)
      return
    }

    const original = existing.originalPositionFor({
      line: mapping.originalLine,
      column: mapping.originalColumn,
    })

    if (original.line === null) {
      console.error("[Merge Source Maps] No existing original found, using merged original", mapping)
    }

    generator.addMapping({
      source: mapping.source,
      original: {
        line: original.line ?? mapping.originalLine,
        column: original.column ?? mapping.originalColumn,
      },
      generated: {
        line: mapping.generatedLine,
        column: mapping.generatedColumn,
      },
    })
  })

  return generator
}

export function addMapping(
  sourceMap: SourceMapGenerator,
  source: string,
  originalLine: number,
  generatedLine: number,
  originalColumn: number = 0,
  generatedColumn: number = 0
) {
  sourceMap.addMapping({
    source: source,
    original: {
      line: originalLine + 1,
      column: originalColumn,
    },
    generated: {
      line: generatedLine + 1,
      column: generatedColumn,
    },
  })
}
