const py = (code) => {
    return pyodide.runPython(code);
}
class AudioGenerator {
    constructor() {
        this.context = new AudioContext();
        this.numpyLoaded = false;
        this.cache = {};
        pyodide.loadPackage('numpy').then(() => {
            py(`import json\nimport numpy as np\nfrom numpy.lib.stride_tricks import as_strided`);
            py(this._spectrogram());
            this.pySpectrogram = pyodide.pyimport('spectrogram');
            this.numpyLoaded = true;
            console.log('numpy loaded');
        });
    }
    _soundFile(filePath) {
        return new Promise((resolve, reject) => {
            console.info('_soundFile()');
            const request = new XMLHttpRequest();
            request.open('GET', filePath, true);
            request.responseType = 'arraybuffer';
            request.onreadystatechange = function(event) {
              if (request.readyState == 4) {
                if (request.status == 200 || request.status == 0) {
                  resolve(request.response); 
                } else {
                  reject({error: '404 Not found'});
                }
              }
            };
            request.send(null);
          });
    }
    _spectrogram () {
        return `def spectrogram(audioBuffer, step, wind, sampleRate):
        w = wind
        step = step
        max_freq = 8000
        eps = 1e-14
        sample_rate = sampleRate
        samples = np.frombuffer(audioBuffer, dtype='float32')
        assert not np.iscomplexobj(samples)
        hop_length = int(0.001 * step * sample_rate)
        fft_length = int(0.001 * w * sample_rate)
        window = np.hanning(fft_length)
        window_norm = np.sum(window ** 2)
        scale = window_norm * sample_rate
        trunc = (len(samples) - fft_length) % hop_length
        x = samples[:len(samples) - trunc]
        nshape = (fft_length, (len(x) - fft_length) // hop_length + 1)
        nstrides = (x.strides[0], x.strides[0] * hop_length)
        x = as_strided(x, shape=nshape, strides=nstrides)
        x = np.fft.rfft(x, axis=0)
        x = np.absolute(x)**2
        x[1:-1, :] *= (2.0 / scale)
        x[(0, -1), :] /= scale
        freqs = float(sample_rate) / fft_length * np.arange(x.shape[0])
        ind = np.where(freqs <= max_freq)[0][-1] + 1
        result = np.transpose(np.log(x[:ind, :] + eps))
        return result`
    }

    // http://haythamfayek.com/2016/04/21/speech-processing-for-machine-learning.html
    _spectrogramFromAudioBuffer (audioBuffer, step, wind, sampleRate) {
        let spectrogram = this.pySpectrogram(audioBuffer, step, wind, sampleRate);
        return { spectrogram: spectrogram };
    }
    spectrogramFromFile (filePath, step, wind, sampleRate) {
        const self = this;
        let spec = null;
        return new Promise((resolve, reject) => {
            if(!this.cache[filePath]){
                this._soundFile(filePath).then((arrayBuffer) => {
                    this.context.decodeAudioData(arrayBuffer, (audioBuffer) => {
                        let buffer = audioBuffer.getChannelData(0);
                        this.cache[filePath] = buffer;
                        if(!this.numpyLoaded) reject({ message: "Numpy was not loaded yet, try again in a few seconds" });
                        spec = this._spectrogramFromAudioBuffer(buffer, step, wind, sampleRate);
                        console.log(spec);
                        resolve(spec);
                    });
                });
            } else {
                spec = this._spectrogramFromAudioBuffer(self.cache[filePath], step, wind, sampleRate);
                console.log(spec);
                resolve(spec);
            }
        });
    }
}