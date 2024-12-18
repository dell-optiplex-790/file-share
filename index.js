var Jimp = require('jimp')
var express = require('express')
var app = express()
var fs = require('fs')
var path = require('path')
var multer = require('multer');
var config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')).toString())

var upload = multer({ dest: path.join(__dirname, 'files') });

app.use(express.static(path.join(__dirname, 'static')))

app.get('/.png', async (req, res) => {
    res.set('Cache-Control', 'no-store')
    var fileName = req.query.f
    if(!fileName) {
        res.redirect('/')
        return
    }
    var filePath = path.join(__dirname, 'files', fileName)
    if(req.headers['user-agent'].endsWith("(compatible; Discordbot/2.0; +https://discordapp.com)")) {
        if(fs.existsSync(filePath)) {
            var image = await genImage({name: fileName, size: fs.statSync(filePath).size, exists: true})
        } else {
            var image = await genImage({name: fileName, exists: false})
        }
        image.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error generating image');
            }
            res.set('Content-Type', 'image/png')
            res.send(buffer);
            res.end()
        });
    } else {
        res.redirect('/f/'+fileName)
    }
   
})

app.get('/f/:file', (req, res) => {
    var fileName = req.params.file
    var filePath = path.join(__dirname, 'files', fileName)
    if(fs.existsSync(filePath)) {
        res.set('Content-Type', 'application/octet-stream')
        res.sendFile(filePath)
    } else {
        res.set('Content-Type', 'text/html')
        res.sendFile(path.join(__dirname, 'static', '404.html'))
    }
})

app.post('/upload', upload.single('file'), (req, res) => {
    try {
        fs.copyFileSync(req.file.path, path.join(req.file.destination, req.file.originalname))
        fs.unlinkSync(req.file.path)
        console.log('Someone uploaded ' + req.file.originalname)
    } catch(e) {console.log(e)}
    res.redirect('/')
})

app.get('/files', (req, res) => {
    var files = path.join(__dirname, 'files')
    res.json(fs.readdirSync(files).map(file=>{return {name: file, size: fs.statSync(path.join(files, file)).size}}))
    res.end()
})


async function genImage(file) {
    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes'
    
        var k = 1024
        var dm = decimals < 0 ? 0 : decimals
        var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    
        var i = Math.floor(Math.log(bytes) / Math.log(k))
    
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
    }
    var image = new Jimp(800, 300, '#fff', (err, image) => {
        if (err) throw err
    })
    var font64 = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK)
    var font32 = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK)
    if(file.exists) {
        image.print(font64, 40, 40, file.name)
        image.print(font32, 40, 110, `Size: ${formatBytes(file.size)}`)
        image.print(font32, 40, 240, 'Middle-click to download this file')
    } else {
        image.print(font64, 40, 40, file.name)
        image.print(font32, 40, 110, `Size: Unknown`)
        image.print(font32, 40, 240, 'Middle-click to download this file')
    }
    return image
}

app.listen(config.port)
