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


var Population = function(x,y,size,r,g,b,opts) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.x = x;
    this.y = y;
    this.size = size;
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
    var dx = this.x-other.x;
    var dy = this.y-other.y;

    var distance = Math.sqrt(dx*dx + dy*dy);
    var distance = 1;
//    console.log(this.r, infection_function(this.r, this.opts.c, this.opts.t*distance, other.opts.vaccinates.r));
    this.r = infection_function(this.r, this.opts.c, this.opts.t*distance, other.opts.vaccinates.r);
    this.g = infection_function(this.g, this.opts.c, this.opts.t*distance, other.opts.vaccinates.g);
    this.b = infection_function(this.b, this.opts.c, this.opts.t*distance, other.opts.vaccinates.b);
    console.log(this.r, this.g, this.b, this.size, this.x, this.y);
};
 

var Simulator = function(opts) {
    this.opts = {
        width: 100,
        height: 100,
        canvas: undefined,
        speed:100,
        num_pops: 10,
        communication_distance:1,
        default_pop: function(x,y) { return new Population(x,y,Math.random() * 100,Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)) }
    }
    extend(this.opts, opts);
//    this.create_table(this.opts.width, this.opts.height);

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
    for (var s_pop_id in this.state) {
        var sp = this.state[s_pop_id];
        for (var t_pop_id in this.state) {
            sp.interact_with(this.state[t_pop_id]);
        }
    }
    this.redraw();
}

Simulator.prototype.reset = function() {
    this.state = [];
    for (var p = 0; p < this.opts.num_pops; p++) {
        this.state.push(this.opts.default_pop(Math.random() * this.opts.width, Math.random()*this.opts.height));
    }
};

var fillCircle = function (ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2, true); 
    ctx.closePath();
    ctx.fill();
}

Simulator.prototype.redraw = function() {
    this.ctx.fillStyle = "white";
    this.ctx.clearRect(0,0,this.opts.width,this.opts.height);
    for (var pop_id in this.state) {
        var p = this.state[pop_id];
        this.ctx.fillStyle = "rgba("+p.r+","+p.g+", "+p.b+",0.5)";
        fillCircle(this.ctx, p.x, p.y, p.size, p.r, p.g, p.b);
    }
};

Simulator.prototype.start = function() {
    this.redraw();
};
