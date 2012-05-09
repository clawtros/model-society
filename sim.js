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
    return wt * (c * t * (1-wt)+a);
};


var Color = function(r,g,b,a) {
    this.r=r;
    this.g=g;
    this.b=b;
    this.a=a;
}
Color.prototype.average = function(c) {
    return new Color((this.r+c.r) / 2.,
                     (this.g+c.g) / 2.,
                     (this.b+c.b) / 2.,
                     (this.a+c.a) / 2.);
}

Color.prototype.as_rgba = function() {
    return "rgba("+Math.round(this.r)+","+Math.round(this.g)+","+Math.round(this.b)+",0.8)";//+this.a+")";
}

Color.prototype.mul = function(amount) {
    return new Color(this.r*amount, this.g*amount, this.b*amount);
}


var Ideology = function(opts) {
    this.opts = {
        color: new Color(0,0,0,1),
        c: 10.0,
        t: 1.1,
        affinity: 0,
    }
    extend(this.opts, opts);
}


var Population = function(sim, x, y, size, ideologies, opts) {
    this.sim = sim;
    this.x = x;
    this.y = y;
    this.size = size;
    this.ideologies = ideologies;
  
    this.opts = {
        error: size/10
    }
    extend(this.opts, opts);
};

Population.prototype.rebalance_weights = function() {
    var over = 0;
    for (var i in this.ideologies) {
        over += this.ideologies[i].weight;
    }
    for (var i in this.ideologies) {
        this.ideologies[i].weight = this.ideologies[i].weight / over;
    }
}

Population.prototype.interact_with = function(other, dt) {
    if (this != other) {
        var dx = this.x-other.x;
        var dy = this.y-other.y;
        var distance = Math.sqrt(dx*dx + dy*dy) / this.max_dist;
        for (var i in this.ideologies) {
            var this_weight = this.ideologies[i].weight;
            var other_weight = other.ideologies[i].weight;
            var weight_delta = infection_function(
                this_weight, 
                other.ideologies[i].ideology.opts.c, 
                other.ideologies[i].ideology.opts.t*(distance), 
                other.ideologies[i].ideology.opts.vaccinates[i]);
            this.ideologies[i].weight = this_weight + weight_delta/dt;
            this.rebalance_weights();
        }
    }
};

Population.prototype.simulate = function(dt) {
    this.max_dist = Math.sqrt(sim.opts.height*sim.opts.height + sim.opts.width*sim.opts.width);
    
    for (var t_pop_id in sim.state) {
        this.interact_with(sim.state[t_pop_id], dt);
    }
};

Population.prototype.color = function() {
    var color=this.ideologies[0].ideology.opts.color.mul(this.ideologies[0].weight);
    for (var i = 1;i < this.ideologies.length; i++) {
        color = color.average(this.ideologies[i].ideology.opts.color.mul(this.ideologies[i].weight));
    }

    return color;
};

var Simulator = function(opts) {
    this.opts = {
        width: 100,
        height: 100,
        canvas: undefined,
        speed:100,
        num_pops: 25,
        communication_distance:1,
        default_pop: function(x,y) { 
            var r = Math.random();
            var r1 = 1 - r * Math.random();
            var r2 = 1 - r - r1;
            return new Population(this, x, y, 
                                  Math.random() * 100,
                                  [
                                      {
                                          'ideology':new Ideology({
                                              color: new Color(255,0,0,0.75),
                                              c : 1.0,
                                              vaccinates: [0.0, 0.1, 0.2]
                                          }),
                                          'weight':r
                                      },
                                      {
                                          'ideology':new Ideology({
                                              color: new Color(0,255,0,0.75),
                                              c: 1.0,
                                              vaccinates: [0.3, 0.0, 0.4]
                                          }),
                                          'weight':r1
                                      },
                                      {
                                          'ideology':new Ideology({
                                              color: new Color(0,0,255,0.75),
                                              c: 1.0,
                                              vaccinates: [0.1, 0.1, 0.1]
                                          }),
                                          'weight':r2
                                      }
                                  ]
                                 );
        }
    };
    extend(this.opts, opts);

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
    var dt = this.opts.speed;
    for (var s_pop_id in this.state) {
        
        var sp = this.state[s_pop_id];
        sp.simulate(dt)
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
    this.ctx.clearRect(0,0,this.opts.width,this.opts.height);
    for (var pop_id in this.state) {
        var p = this.state[pop_id];
        this.ctx.fillStyle = p.color().as_rgba();
        fillCircle(this.ctx, p.x, p.y, p.size, p.r, p.g, p.b);
    }
};

Simulator.prototype.start = function() {
    this.redraw();
};
