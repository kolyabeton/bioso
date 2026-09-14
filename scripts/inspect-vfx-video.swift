import AVFoundation
import AppKit
import Foundation

let url = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
let asset = AVURLAsset(url: url)
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = .zero
print("duration=\(CMTimeGetSeconds(asset.duration))")
let sheet = NSImage(size: NSSize(width: 1200, height: 600))
sheet.lockFocus()
NSColor.black.setFill(); NSRect(x: 0, y: 0, width: 1200, height: 600).fill()
for i in 0..<12 {
 let seconds = 0.12 + Double(i) * 0.24
 let cg = try generator.copyCGImage(at: CMTime(seconds: seconds, preferredTimescale: 600), actualTime: nil)
 let image = NSImage(cgImage: cg, size: NSSize(width: cg.width, height: cg.height))
 // Inspect the central combat area, without changing game camera or VFX size.
 let source = NSRect(x: Double(cg.width)*0.26, y: Double(cg.height)*0.36, width: Double(cg.width)*0.48, height: Double(cg.height)*0.38)
 image.draw(in: NSRect(x: (i%6)*200, y: (1-i/6)*300, width: 200, height: 280), from: source, operation: .copy, fraction: 1)
 let text = NSAttributedString(string: String(format: "%.2fs", seconds), attributes: [.foregroundColor: NSColor.white, .font: NSFont.systemFont(ofSize: 15)])
 text.draw(at: NSPoint(x: (i%6)*200+8, y: (1-i/6)*300+282))
}
sheet.unlockFocus()
let bitmap = NSBitmapImageRep(data: sheet.tiffRepresentation!)!
try bitmap.representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent("contact-sheet.png"))
