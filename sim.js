var TIMESCALE = 1/50.;

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
    return "rgba("+Math.round(this.r)+","+Math.round(this.g)+","+Math.round(this.b)+",0.5)";//+this.a+")";
}

Color.prototype.mul = function(amount) {
    return new Color(this.r*amount, this.g*amount, this.b*amount);
}


var Ideology = function(opts) {
    this.opts = {
        color: new Color(0,0,0,1),
        c: 1.0,
        t: 1.1,
        affinity: 0,
    }
    extend(this.opts, opts);
}
Ideology.prototype.c_distance = function (other, dist) {
    var tc = this.opts.color;
    var oc = other.opts.color;
    return Math.sqrt((tc.r-oc.r)*(tc.r-oc.r)+
                     (tc.g-oc.g)*(tc.g-oc.g)+
                     (tc.b-oc.b)*(tc.b-oc.b)
                    );
};

var Population = function(sim, x, y, size, ideologies, opts) {
    this.sim = sim;
    this.x = x;
    this.y = y;
    this.size = size;
    this.ideologies = ideologies;
  
    this.opts = {
        error: size/10.
    }
    extend(this.opts, opts);
};

Population.prototype.compatibility = function(other) {
    var d = [];
    var sqrsum = 0;

    for (var i in this.ideologies) {
        d[i] = this.ideologies[i].weight - other.ideologies[i].weight;
    }
    
    for (var i in this.ideologies) {
        sqrsum = sqrsum + d[i] * d[i];
    }

    return Math.sqrt(sqrsum);
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
        var distance = (Math.sqrt(dx*dx + dy*dy)) / this.max_dist;

        if (this.compatibility(other) > (this.opts.error * (Math.random() + 0.5))*(distance/2)) {
            var exodus = 0.1*Math.random()*this.size*TIMESCALE;
            this.size -= exodus;
            other.size += exodus;
        }


        for (var i in this.ideologies) {
            var this_weight = this.ideologies[i].weight;
            var other_weight = other.ideologies[i].weight;
            var w_delta = Math.abs(this_weight - other_weight) * distance;
            var weight_delta = infection_function(
                this_weight, 
                w_delta * other.ideologies[i].ideology.opts.c,
                w_delta * other.ideologies[i].ideology.opts.t*(1 - distance), 
                this_weight * other.ideologies[i].ideology.opts.vaccinates[i]);
            this.ideologies[i].weight = this_weight + (weight_delta/dt)*TIMESCALE;
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
        speed:33,
        num_pops: 50,
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
                                              vaccinates: [0.0, 0.1, 0.9]
                                          }),
                                          'weight':r
                                      },
                                      {
                                          'ideology':new Ideology({
                                              color: new Color(0,255,0,0.75),
                                              c: 1.0,
                                              vaccinates: [0.9, 0.0, 0.1]
                                          }),
                                          'weight':r1
                                      },
                                      {
                                          'ideology':new Ideology({
                                              color: new Color(0,0,255,0.75),
                                              c: 1.0,
                                              vaccinates: [0.1, 0.9, 0.0]
                                          }),
                                          'weight':r2
                                      }
                                  ]
                                 );
        }
    };
    extend(this.opts, opts);
    this.interval = undefined;
    this.canvas = document.getElementById(this.opts.canvas);
    this.canvas.width = this.opts.width;
    this.canvas.height = this.opts.height;
    this.ctx = this.canvas.getContext('2d');
    this.reset();
};

Simulator.prototype.animate = function() {
    if (!this.interval) {
        var simulator = this;
        
        this.interval = setInterval(function() { simulator.step() }, simulator.opts.speed);
    }
}

Simulator.prototype.stop = function() {
    clearInterval(this.interval);
    this.interval = undefined;
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



Simulator.prototype.background = function() {
    var gridsize = this.opts.width / 20;

    for (var j = 0; j < this.opts.width; j += gridsize) {
        for (var i = 0; i < this.opts.width; i += gridsize) {

        }
    }
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

Simulator.prototype.handle_click = function(e) {
    console.log('click');
    console.log(e);
    var offX = e.pageX - e.target.offsetLeft;
    var offY = e.pageY - e.target.offsetTop;

    var size = 100;
    var new_pop = this.opts.default_pop(offX, offY);
    new_pop.size = size;
    this.state.push(new_pop);

    this.redraw();
};
