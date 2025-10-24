#!/usr/bin/env python3
"""
Voice Prompt Audio Processor

Processes raw voice prompt recordings for inclusion in blog post audio companions.
Applies normalization, compression/EQ, and silence truncation.

Key features:
- Silence detection and truncation (removes pauses for thought)
- Audio normalization (brings volume to consistent level)
- Compression and EQ tailored for voice (enhances clarity and consistency)
- Preserves audio quality while reducing file size

Usage:
    python process_voice_prompt.py input.mp3 [output.mp3]

If output path is not specified, generates output with '_processed' suffix.
"""

import argparse
import subprocess
import sys
import os
from pathlib import Path


class VoicePromptProcessor:
    """Process voice prompt audio files with normalization, compression, and silence removal."""

    def __init__(self):
        # Audio processing parameters optimized for desk recording of male voice
        self.silence_threshold = "-40dB"  # Threshold for silence detection
        self.silence_duration = "0.5"     # Minimum silence duration to keep (seconds)
        self.max_silence_duration = "0.5" # Maximum silence to leave in (compress longer pauses)
        self.target_loudness = "-16"      # Target LUFS for normalization (podcast standard)

        # EQ settings for voice enhancement
        # These enhance clarity and reduce room resonance
        self.eq_filters = [
            "highpass=f=100",             # Remove low rumble/room noise (more aggressive)
            "lowpass=f=10000",            # Remove high-frequency hiss (more aggressive)
            "equalizer=f=150:t=q:w=1:g=-3",   # Reduce low-end rumble
            "equalizer=f=200:t=q:w=1:g=-2",   # Reduce boominess
            "equalizer=f=3000:t=q:w=2:g=3",   # Enhance clarity/presence (boosted)
        ]

        # Noise reduction (afftdn = adaptive FFT denoiser)
        self.noise_reduction = "afftdn=nf=-25"

        # Compression settings for consistent volume
        self.compressor = "acompressor=threshold=-20dB:ratio=4:attack=5:release=50"

    def check_ffmpeg(self):
        """Verify ffmpeg is installed and available."""
        try:
            subprocess.run(
                ["ffmpeg", "-version"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=True
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("Error: ffmpeg not found. Please install ffmpeg to use this script.")
            return False

    def get_audio_info(self, input_file):
        """Get basic information about the input audio file."""
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            input_file
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return result.stdout
        except subprocess.CalledProcessError as e:
            print(f"Error analyzing audio file: {e}")
            return None

    def build_filter_chain(self):
        """Build the complete ffmpeg filter chain."""
        filters = []

        # Step 1: Noise reduction first (works best on raw audio)
        filters.append(self.noise_reduction)

        # Step 2: Remove silence at start/end and truncate long pauses
        # This is the most important filter for removing "thinking pauses"
        silence_filter = (
            f"silenceremove="
            f"start_periods=1:"
            f"start_silence={self.silence_duration}:"
            f"start_threshold={self.silence_threshold}:"
            f"stop_periods=-1:"
            f"stop_silence={self.silence_duration}:"
            f"stop_threshold={self.silence_threshold}:"
            f"detection=peak"
        )
        filters.append(silence_filter)

        # Step 3: Apply EQ filters
        filters.extend(self.eq_filters)

        # Step 4: Apply compression for consistent volume
        filters.append(self.compressor)

        # Step 5: Normalize loudness to target level
        # Using two-pass loudnorm for best results
        filters.append(f"loudnorm=I={self.target_loudness}:TP=-1.5:LRA=11")

        return ",".join(filters)

    def process_audio(self, input_file, output_file, verbose=False):
        """Process the audio file with all filters."""
        if not os.path.exists(input_file):
            print(f"Error: Input file '{input_file}' not found.")
            return False

        filter_chain = self.build_filter_chain()

        cmd = [
            "ffmpeg",
            "-i", input_file,
            "-af", filter_chain,
            "-ar", "44100",        # Sample rate (maintain standard quality)
            "-ac", "1",            # Convert to mono (voice doesn't need stereo)
            "-c:a", "libmp3lame",  # MP3 codec
            "-b:a", "96k",         # Bitrate (good quality for voice)
            "-y",                  # Overwrite output file if exists
            output_file
        ]

        if verbose:
            print(f"\nProcessing: {input_file}")
            print(f"Output: {output_file}")
            print(f"\nFilter chain: {filter_chain}\n")
        else:
            # Suppress ffmpeg output
            cmd.insert(1, "-loglevel")
            cmd.insert(2, "error")

        try:
            result = subprocess.run(cmd, check=True, capture_output=not verbose)

            if verbose:
                print("\n✓ Processing complete!")

            # Show file size comparison
            input_size = os.path.getsize(input_file) / 1024 / 1024
            output_size = os.path.getsize(output_file) / 1024 / 1024
            reduction = ((input_size - output_size) / input_size) * 100

            print(f"\nFile size: {input_size:.2f}MB → {output_size:.2f}MB ({reduction:.1f}% reduction)")

            return True

        except subprocess.CalledProcessError as e:
            print(f"Error processing audio: {e}")
            return False

    def analyze_silence(self, input_file):
        """Analyze silence patterns in the audio (for debugging/optimization)."""
        cmd = [
            "ffmpeg",
            "-i", input_file,
            "-af", f"silencedetect=noise={self.silence_threshold}:d={self.silence_duration}",
            "-f", "null",
            "-"
        ]

        print(f"\nAnalyzing silence patterns in: {input_file}")
        print(f"Threshold: {self.silence_threshold}, Min duration: {self.silence_duration}s\n")

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)

            # Parse silence events from stderr
            silence_events = []
            for line in result.stderr.split('\n'):
                if 'silencedetect' in line and 'silence_' in line:
                    print(line)
                    if 'silence_duration' in line:
                        silence_events.append(line)

            print(f"\nTotal silence periods detected: {len(silence_events)}")

        except subprocess.CalledProcessError as e:
            print(f"Error analyzing silence: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Process voice prompt audio with normalization, compression, and silence removal."
    )
    parser.add_argument(
        "input",
        help="Input audio file (MP3, WAV, M4A, etc.)"
    )
    parser.add_argument(
        "output",
        nargs="?",
        help="Output audio file (defaults to input_processed.mp3)"
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Show detailed processing information"
    )
    parser.add_argument(
        "-a", "--analyze",
        action="store_true",
        help="Analyze silence patterns without processing"
    )
    parser.add_argument(
        "--silence-threshold",
        default="-35dB",
        help="Silence detection threshold (default: -35dB)"
    )
    parser.add_argument(
        "--silence-duration",
        default="0.4",
        help="Minimum silence duration to remove in seconds (default: 0.4)"
    )
    parser.add_argument(
        "--target-loudness",
        default="-16",
        help="Target loudness in LUFS (default: -16, podcast standard)"
    )

    args = parser.parse_args()

    # Initialize processor
    processor = VoicePromptProcessor()

    # Override defaults if specified
    if args.silence_threshold:
        processor.silence_threshold = args.silence_threshold
    if args.silence_duration:
        processor.silence_duration = args.silence_duration
    if args.target_loudness:
        processor.target_loudness = args.target_loudness

    # Check ffmpeg availability
    if not processor.check_ffmpeg():
        return 1

    # Analyze mode
    if args.analyze:
        processor.analyze_silence(args.input)
        return 0

    # Determine output filename
    if args.output:
        output_file = args.output
    else:
        input_path = Path(args.input)
        output_file = str(input_path.parent / f"{input_path.stem}_processed{input_path.suffix}")

    # Process audio
    success = processor.process_audio(args.input, output_file, verbose=args.verbose)

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
