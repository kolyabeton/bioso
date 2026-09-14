import AVFoundation
import Foundation
let asset = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1]))
let output = URL(fileURLWithPath: CommandLine.arguments[2])
let exporter = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetHighestQuality)!
exporter.outputURL = output
exporter.outputFileType = .mp4
exporter.timeRange = CMTimeRange(start: .zero, duration: CMTime(seconds: 3, preferredTimescale: 600))
let done = DispatchSemaphore(value: 0)
exporter.exportAsynchronously { done.signal() }
done.wait()
guard exporter.status == .completed else { fatalError(String(describing: exporter.error)) }
print(output.path)
