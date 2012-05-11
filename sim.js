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

        if (comp*(1/distance)/sim.attraction < 0.10) {
            this.x -= (dx*sim.attraction/20)*TIMESCALE;
            this.y -= (dy*sim.attraction/20)*TIMESCALE;
        }
        
        if (d1 < (this.size+other.size)*sim.territorialism/2.) {
            this.x += (dx/20)*TIMESCALE;
            this.y += (dy/20)*TIMESCALE;            
        }

        for (var i in this.ideologies) {
            var this_weight = this.ideologies[i].weight;
            var other_weight = other.ideologies[i].weight;
            var w_delta = Math.abs(this_weight - other_weight) * distance;
            var weight_delta = infection_function(
                this_weight, 
                0.1*other.ideologies[i].ideology.opts.c*(1/distance) * sim.communicability,
                0.1*other.ideologies[i].ideology.opts.t * sim.transmissibility, 
                other.ideologies[i].ideology.opts.vaccinates[i]);
            this.ideologies[i].weight = this_weight + (weight_delta/dt)*TIMESCALE;
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
    this.attraction = 1;
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

    this.max_foods          = 100;
    this.foods              = []
    this.starting_foods(this, 100);

};

var Foodstuff = function(sim, x, y){
    this.sim = sim
    this.default_lifespan   = 1000;
    this.spawn_chance       = 1;
    this.max_vel = 2;
    this.spawned = false;
    this.vel_x = 0;
    this.vel_y = 0;
    this.x = x; 
    this.y = y;
    this.visual_range = 30;
    this.anger_timeout = 10;
    this.anger_level = 0
    this.lifespan;
    this.age = 0;
    this.size  = 2;
    this.init();
}

Foodstuff.prototype = {
    init: function(){
        console.log([this.x, this.y, this.lifespan])
        this.place();
        this.random_lifespan();
        this.random_vel();
        console.log([this.x, this.y, this.lifespan])
        // foodstuffs should appear on the map
        // they will be small green circles, or something.
    },

    place: function(){
    
        var sim_w = this.sim.opts.width;
        var sim_h = this.sim.opts.height;
        if (this.x == undefined){
            this.x = random_within(sim_w);
        }
        if (this.y == undefined){
            this.y = random_within(sim_h);
        }


    },

    random_lifespan: function(){
        this.lifespan = random_within(this.default_lifespan)
    },

    random_vel: function(){
        this.vel_x = (random_within(this.max_vel * 2)) - this.max_vel;
        this.vel_y = (random_within(this.max_vel * 2)) - this.max_vel;
    },

    get_older: function(){
        this.age++;
        if (this.age > this.lifespan){
            this.die();
        }
    },
    move: function(){
        this.x = this.x + this.vel_x;
        this.y = this.y + this.vel_y;
        if (this.x > this.sim.opts.width){ this.x = 0 }        
        if (this.x < 0){ this.x = this.sim.opts.width }        
        if (this.y > this.sim.opts.height){ this.y = 0 }        
        if (this.y < 0){ this.y = this.sim.opts.height }        
        
    },
    mood: function(){
      if (this.anger_level > 0){
          this.anger_level--
          this.color = this.angry_color;         
      } else {
          this.color = this.base_color();
      }  
    },
    base_color: function(){
        if (this.spawned === true) {
            return this.spawn_color;
        } else {
            return this.default_color;
        }
    },
    reproduce: function(){
        // var spawning = random_within(this.spawn_chance)
        // if ((spawning == 1 )){
            console.log('i spawned')
            this.sim._add_food(this.x - 10, this.y - 10);
            this.random_vel();
            this.color = this.spawn_color;
            this.spawned = true;
        // }
    }, 
    die: function(){
        console.log('i died')
        sim._remove_food(this)
    },
    spawn_color: new Color(30, 30, 0, 1),
    angry_color: new Color(255, 100, 0, 1),
    default_color: new Color(0,100,0,1),    
    color: new Color(255,0,0,1),
    simulate: function(){
        this.get_older();
        this.move();
        this.interact_with_kin();
        this.mood();
        // this.reproduce();
    },

    interact_with_kin: function(){
        var self = this;
        var all_foods = this.sim.foods;

        for (var i = all_foods.length - 1; i >= 0; i--){
            var other  = all_foods[i]
            if (other == self) {continue}
            if (self.can_touch(other)){
                self.reproduce();
            }
            if (self.can_see(other)){
                this.anger_level = this.anger_timeout;                 
            }
            
        };
        

    }, 
    dist_from: function(other){
        var dx = this.x-other.x;
        var dy = this.y-other.y;
        var dist = (Math.sqrt(dx*dx + dy*dy));        
        return dist
    },
    can_touch: function(other){
        var dist = this.dist_from(other);
        var touched = ( dist < this.size)
        return touched;
    },
    can_see: function(other){
        return (this.dist_from(other) < this.visual_range)
    }
    
}

Simulator.prototype.starting_foods = function(sim, n){
    var i = n
    for (i; i >= 0; i--){
        this._add_food();
    };
}
Simulator.prototype._add_food = function(x, y){
    if (this.foods.length > this.max_foods) {return}
    this.foods.push(new Foodstuff(this, x, y))
}

Simulator.prototype._remove_food = function(food){
    var index = this.foods.indexOf(food);
    this.foods.splice(index, 1)
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
    for (var s_pop_id in this.state) {        
        var sp = this.state[s_pop_id];
        sp.simulate(dt)
    }

    for (var food_i in this.foods) {
        var food = this.foods[food_i]
        food.simulate();
    }

    this.redraw();
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
    this.ctx.clearRect(0,0,this.opts.width,this.opts.height);
    for (var pop_id in this.state) {
        var p = this.state[pop_id];
        this.ctx.fillStyle = p.color().as_rgba();
        fillCircle(this.ctx, p.x, p.y, p.size, p.r, p.g, p.b);
    }

    for (var food_i in this.foods) {
        var food = this.foods[food_i]
        this.ctx.fillStyle = food.color.as_rgba();
        fillCircle(this.ctx, food.x, food.y, food.size, food.color.r, food.color.g, food.color.b);
    }

    
    if (this.opts.debug) {
        var debugstr = "";
        document.getElementById();
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
