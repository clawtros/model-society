var extend = function(a,b) {
    for (k in b) {
        a[k] = b[k];
    }
};


var bound = function(n, low, high) {
    return Math.max(low, Math.min(high, n));
};


var setPixel = function(imageData, x, y, r, g, b) {
    index = (x + y * imageData.width) * 4;
    imageData.data[index+0] = r;
    imageData.data[index+1] = g;
    imageData.data[index+2] = b;
    imageData.data[index+3] = 255;
};


var infection_function = function(wt, c, t, a) {
    return bound(wt + (wt * (c * t * ((255.0-wt) / 255.0) )+a/255)/255, 0, 255);
};


var Population = function(r,g,b,opts) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.opts = {
        c: 10.0,
        t: 0.1,
        affinity: 0,
        vaccinates: {
            r:255-g,
            b:50,
            g:255-r
        }
    }
    extend(this.opts, opts);
};
Population.prototype.interact_with = function(other) {
    this.r = infection_function(this.r, this.opts.c, this.opts.t, other.opts.vaccinates.r);
    this.g = infection_function(this.g, this.opts.c, this.opts.t, other.opts.vaccinates.g);
    this.b = infection_function(this.b, this.opts.c, this.opts.t, other.opts.vaccinates.b);
};


var World = function(opts) {
    this.pop_centers = opts['pop_centers'] || [];
}
World.prototype.simulate = function(dt) {
    
};
 

var Simulator = function(opts) {
    this.opts = {
        width: 100,
        height: 100,
        canvas: undefined,
        speed:100,
        communication_distance:1,
        default_pop: function(x,y) { return new Population(Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)) }
    }
    extend(this.opts, opts);
    this.create_table(this.opts.width, this.opts.height);

    this.canvas = document.getElementById(this.opts.canvas);
    this.canvas.width = this.opts.width;
    this.canvas.height = this.opts.height;
    this.ctx = this.canvas.getContext('2d');
    this.reset();
    this.to_stop = false;
};
Simulator.prototype.animate = function() {
    this.step();
    var simulator = this;
    if (!this.to_stop) { 
        setTimeout(function() { simulator.animate(); }, simulator.opts.speed);
    } else {
        this.to_stop = false;
    }
}
Simulator.prototype.stop = function() {
    this.to_stop = true;
}
Simulator.prototype.create_table = function(w,h) {
    this.backup = document.getElementById('backup');
    this.table = this.backup.appendChild(document.createElement('table'));
    for (var y=0; y < h; y++) {
        var tr = this.backup.appendChild(document.createElement('tr'));        
        for (var x=0; x < w; x++) {
            var td = tr.appendChild(document.createElement('td'));
            td.id = "td_" + x + "_" + y;
        }
    }
}
Simulator.prototype.step = function() {
    for (var y=0; y < this.opts.height; y++) {
        for (var x=0; x < this.opts.width; x++) {
            var ns = this.neighbors(x,y,this.opts.communication_distance)
            var here = this.state[x][y];
            for (var iy in ns) {
                var row = ns[iy];

                for (var ix in row) {
                    var there = row[ix];
                    here.interact_with(there);
                }
            }
        }
    }
    this.redraw();
}
Simulator.prototype.reset = function() {
    this.state = [];
    for (var y=0; y < this.opts.height; y++) {
        var row = [];
        for (var x=0; x < this.opts.width; x++) {
            row.push(this.opts.default_pop(x,y));
        }
        this.state.push(row);
    }
};
Simulator.prototype.neighbors = function(x,y,d) {
    var result = [];
    for (var y = bound(y-d, 0, this.opts.height); y < bound(y+d, 0, this.opts.height); y++) {
        var row = []
        for (var x = bound(x-d, 0, this.opts.width); x < bound(x+d, 0, this.opts.width); x++) {
            row.push(this.state[x][y]);
        }
        result.push(row)
    }
    return result;
};
Simulator.prototype.redraw = function() {
    var id = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    for (var y=0; y < this.opts.height; y++) {
        for (var x=0; x < this.opts.width; x++) {
            var i = this.state[x][y];
            setPixel(id, x, y, i.r, i.g, i.b);
            var td = document.getElementById("td_" + x + "_" + y);
            td.style.background = "rgb("+Math.round(i.r)+","+Math.round(i.g)+","+Math.round(i.b)+")";
        }
    }
    this.ctx.putImageData(id, 0, 0);
    return id;
};
Simulator.prototype.start = function() {
    this.redraw();
};
