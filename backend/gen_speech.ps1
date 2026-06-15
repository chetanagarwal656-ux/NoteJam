Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SetOutputToWaveFile('C:\Users\Chetan Agarwal\Downloads\Note_Jam\backend\speech.wav')
$synth.Speak('Hello, this is a test of the voice activity detection.')
$synth.Dispose()
