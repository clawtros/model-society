var TIMESCALE = 1/50.;
var MAX_POPS=70;

var fillCircle = function (ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2, true); 
    ctx.closePath();
    ctx.fill();
}

var extend = function(a,b) {
    for (k in b) {
        a[k] = b[k];
    }
};

var bound = function(n, low, high) {
    return Math.max(low, Math.min(high, n));
};

var random_within = function(n){
    return Math.floor(Math.random() * n);
}

var setPixel = function(imageData, x, y, r, g, b) {
    index = (x + y * imageData.width) * 4;
    imageData.data[index+0] = r;
    imageData.data[index+1] = g;
    imageData.data[index+2] = b;
    imageData.data[index+3] = 255;
};


var infection_function = function(wt, c, t, a) {
    return wt * c * t * ((1-wt)+a);
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

Color.prototype.sub = function(that) {
    return new Color(this.r-that.r, this.g-that.g, this.b-that.b);
}


Color.prototype.add = function(that) {
    return new Color(this.r+that.r, this.g+that.g, this.b+that.b);
}


var Ideology = function(opts) {
    this.opts = {
        color: new Color(0,0,0,1),
        c: 1.0,
        t: 1.0,
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
        error: Math.random() * 10
    }
    extend(this.opts, opts);
};

Population.prototype.compatibility = function(other, error) {
    
    var d = [];
    var sqrsum = 0;

    for (var i in this.ideologies) {
        d[i] = (this.ideologies[i].weight - other.ideologies[i].weight) * (error ? (Math.random() * error) + 0.5 : 1 );
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
        var d1 = (Math.sqrt(dx*dx + dy*dy));
        var distance = d1 / this.max_dist;
        var comp = this.compatibility(other);
        var e_comp = this.compatibility(other, this.error);

        if (comp > (this.opts.error)*(distance/2)) {
            var exodus = 0.1*Math.random()*this.size*TIMESCALE;
            this.size -= exodus;
            other.size += exodus;

        }
        var old_color = this.color();
        if (comp*(1/distance)/sim.attraction < 0.10) {
            this.x -= (dx*sim.attraction/20)*TIMESCALE;
            this.y -= (dy*sim.attraction/20)*TIMESCALE;
        }
        
        if (d1 < (this.size+other.size)*sim.territorialism/2.) {
            this.x += (dx/20)*TIMESCALE;
            this.y += (dy/20)*TIMESCALE;            
        }
        var ds = 0;
        for (var i in this.ideologies) {
            var this_weight = this.ideologies[i].weight;
            var other_weight = other.ideologies[i].weight;
            var w_delta = Math.abs(this_weight - other_weight);
            var weight_delta = infection_function(
                this_weight, 
                0.1*other.ideologies[i].ideology.opts.c*(1/distance) * sim.communicability,
                0.1*other.ideologies[i].ideology.opts.t * sim.transmissibility, 
                other.ideologies[i].ideology.opts.vaccinates[i]);
            this.ideologies[i].weight = this_weight + (weight_delta/dt)*TIMESCALE;
            ds += weight_delta;
        }
        if (sim.draw_lines) {
            sim.ctx.save();
            document.getElementById('debug').innerHTML = ds;
            var new_color = this.color().sub(old_color);
            sim.ctx.strokeStyle = "rgba(0,0,0,0.2)";
            sim.ctx.lineWidth = ds*100;
            sim.ctx.beginPath();
            sim.ctx.moveTo(this.x, this.y);
            sim.ctx.lineTo(other.x, other.y);
            sim.ctx.stroke();
            sim.ctx.closePath();
            sim.ctx.restore();
        }
        this.rebalance_weights();
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
    this.draw_lines = true;
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
                                              vaccinates: [0.0, 1.0, 0.0]
                                          }),
                                          'weight':r
                                      },
                                      {
                                          'ideology':new Ideology({
                                              color: new Color(0,255,0,0.75),
                                              c: 1.0,
                                              vaccinates: [1.0, 0.0, 0.0]
                                          }),
                                          'weight':r1
                                      },
                                      {
                                          'ideology':new Ideology({
                                              color: new Color(0,0,255,0.75),
                                              c: 1.0,
                                              vaccinates: [0.5, 0.5, 0.0]
                                          }),
                                          'weight':r2
                                      }
                                  ]
                                 );
        }
    };
    this.attraction = 0.1;
    this.territorialism = 1;
    this.communicability = 1;
    this.transmissibility = 1;

    extend(this.opts, opts);
    this.interval = undefined;
    this.canvas = document.getElementById(this.opts.canvas);
    this.canvas.width = this.opts.width;
    this.canvas.height = this.opts.height;
    this.ctx = this.canvas.getContext('2d');
    this.reset();

    this.max_bugs          = 100;
    this.bugs              = []
    this.starting_bugs(this, 0);

};



Simulator.prototype.starting_bugs = function(sim, n){
    var i = n
    for (i; i >= 0; i--){
        this._add_bug();
    };
}
Simulator.prototype._add_bug = function(x, y){
    if (this.bugs.length > this.max_bugs) {return}
    this.bugs.push(new Bug(this, x, y))
}

Simulator.prototype._remove_bug = function(bug){
    var index = this.bugs.indexOf(bug);
    this.bugs.splice(index, 1)
}

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
    this.redraw();

    for (var s_pop_id in this.state) {        
        var sp = this.state[s_pop_id];
        sp.simulate(dt)
    }

    for (var bug_i in this.bugs) {
        var bug = this.bugs[bug_i];
        bug.simulate(dt);
    }
    document.getElementById('pop').innerHTML = this.bugs.length;

}

Simulator.prototype.reset = function() {
    this.state = [];
    for (var p = 0; p < this.opts.num_pops; p++) {
        this.state.push(this.opts.default_pop(Math.random() * this.opts.width, Math.random()*this.opts.height));
    }
};



Simulator.prototype.background = function() {
    var gridsize = this.opts.width / 20;

    for (var j = 0; j < this.opts.width; j += gridsize) {
        for (var i = 0; i < this.opts.width; i += gridsize) {

        }
    }
}

Simulator.prototype.redraw = function() {
    this.ctx.fillStyle="rgba(255,255,255,1)";
    this.ctx.fillRect(0,0,this.opts.width,this.opts.height);
    for (var pop_id in this.state) {
        var p = this.state[pop_id];
        this.ctx.fillStyle = p.color().as_rgba();
        fillCircle(this.ctx, p.x, p.y, p.size, p.r, p.g, p.b);
    }
    for (var bug_i in this.bugs) {
        var bug = this.bugs[bug_i]
        this.ctx.fillStyle = bug.color.as_rgba();
        fillCircle(this.ctx, bug.x, bug.y, bug.size, bug.color.r, bug.color.g, bug.color.b);
        this.ctx.fillStyle = "rgba(0, 10, 10, 0.01);"
        fillCircle(this.ctx, bug.x, bug.y, bug.visual_range, 0, 255, 0);
        this.ctx.fillStyle = "rgba(0, 255, 0 , 0.02);"
        fillCircle(this.ctx, bug.x, bug.y, bug.stink, 0, 255, 0);

    }
    
    if (this.opts.debug) {
    }
    
};

Simulator.prototype.start = function() {
    this.redraw();
};


Simulator.prototype.handle_click = function(e) {

    var offX = e.pageX - e.target.offsetLeft;
    var offY = e.pageY - e.target.offsetTop;

    var size = 100;
    var new_pop = this.opts.default_pop(offX, offY);
    new_pop.size = size;
    this.state.push(new_pop);
    if (this.state.length > MAX_POPS) {
        this.state.shift();
    }
    this.redraw();
};
