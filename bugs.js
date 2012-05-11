var Bug = function(sim, x, y){
    this.sim = sim
    this.default_lifespan   = 400;
    this.spawn_chance       = 1;
    this.sexual_maturity    = 30;
    this.gestation_period   = 10;
    this.post_gestational_sterility = 20;
    this.percent_females    = 50;
    this.growth_rate        = 5;
    this.stink_growth_rate  = 1;
    this.base_size          = 2;

    this.base_stink         = 0;
    this.litter_size        = 2;
    this.initial_size       = 0.5;
    this.standoff_distance  = 10;
    this.visual_range       = 30;
    this.anger_timeout      = 10;
    
    
    this.max_vel = 2;



    this.spawned  = false;
    this.pregnant = false;
    this.fertile  = false;
    this.sex;
    this.pregnant_counter   = 0;
    this.sterility_counter  = 0
    this.anger_level = 0


    this.vel_x = 0;
    this.vel_y = 0;
    this.x = x; 
    this.y = y;

    this.male_color     = new Color(0, 0, 0, 0);
    this.female_color   = new Color(0, 0, 0, 0);
    this.spawn_color    = new Color(0, 0, 0, 1);
    this.angry_color    = new Color(255, 100, 0, 1);
    this.default_color  = new Color(0,100,0,1);
    this.juvenile_color = new Color(0,0,0,1);
    this.color          = this.default_color;

    this.lifespan;
    this.age = 0;
    this.juvenile = true;
    this.size  = this.initial_size;
    this.stink = this.base_stink;
    this.init();
}

Bug.prototype = {
    init: function(){
        this.place();
        this.random_lifespan();

        this.init_vel();
        this.set_sex();
        this.init_stink();
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
    set_sex: function(){
        var n = random_within(100);
        if (n < this.percent_females) {
            this.sex = 'female';
        } else {
            this.sex = 'male';
        }
    },
    random_lifespan: function(){
        this.lifespan = random_within(this.default_lifespan)
    },
    init_stink: function(){
        this.stink = 1;
        if (this.sex == 'male'){
            this.stink = 0;
        }
    },

    init_vel: function(){
        this.vel_x = (random_within(this.max_vel * 2)) - this.max_vel;
        this.vel_y = (random_within(this.max_vel * 2)) - this.max_vel;
    },

    get_older: function(){
        this.age++;
        if (this.age > this.lifespan){
            this.die();
        }
        if (this.age > this.sexual_maturity){
            this.fertile = true;  
            this.juvenile = false;          
        }
        if (this.sterility_counter > 1){
            this.fertile = false;
            this.sterility_counter--;
        }
        if (this.sterility_counter == 1){
            this.fertile = true;            
        }
        if (this.juvenile && !this.adult_sized()){
            var rate = (100 + this.growth_rate) / 100
            this.size = this.size * rate;
        }
        if (this.sex == 'female'){
            if (this.natural_stink === undefined){this.natural_stink = 0}
            this.natural_stink = this.natural_stink + this.stink_growth_rate;
            if (this.fertile){
                this.stink = this.natural_stink;
            } else {
                this.stink = 0;
            }
        }
        

    },
    move: function(){
        if (this.vel_x > this.max_vel)       {this.vel_x = this.max_vel}
        if (this.vel_x < (this.max_vel * -1)){this.vel_x = (this.max_vel * -1)}
        if (this.vel_y > this.max_vel)       {this.vel_y = this.max_vel}
        if (this.vel_y < (this.max_vel * -1)){this.vel_y = (this.max_vel * -1)}

        this.x = this.x + this.vel_x;
        this.y = this.y + this.vel_y;
        if (this.x > this.sim.opts.width){ this.x = 0 }        
        if (this.x < 0){ this.x = this.sim.opts.width }        
        if (this.y > this.sim.opts.height){ this.y = 0 }        
        if (this.y < 0){ this.y = this.sim.opts.height }        
        
    },
    
    adult_sized: function(){
        if (this.size < this.base_size){
            return false;
        } else {
            return true;
        }
        
    },
    
    mood: function(){
      if (this.anger_level > 0){
          this.anger_level--
          this.color = this.angry_color; 
      } else {
          this.color = this.base_color();

      }
       
    },
    gender_color: function(){
        if (this.sex == 'male'){
            return this.male_color;
        } else {
            return this.female_color;
        }
    },
    base_color: function(){
        if (this.juvenile === true){
            return this.juvenile_color;
        }
        // if (this.spawned === true) {
        //     return this.spawn_color;
        // }
      return this.gender_color();
    },
    mate: function(other){
       if (this.sex == 'male'){return}
       if (other.sex == 'female'){return}
        if (this.fertile) {
            this.pregnant = true;
        }
        
    },
    reproduce: function(){
            if (this.pregnant == false) {
                if (this.size > this.base_size) {
                    this.size = this.size - 0.5;
                }
                return
            } else {
                this.pregnant_counter++
                this.size = this.size + 0.5
            }

            if (this.pregnant_counter > this.gestation_period){                
                var dist = 0;
                for (var i=0; i < this.litter_size; i++) {
                    var far = dist * i
                    this.sim._add_bug(this.x + far, this.y + far);
                };

                this.init_vel();
                this.color = this.spawn_color;
                this.spawned = true;
                this.pregnant = false;
                this.sterility_counter = this.post_gestational_sterility;
                // this.size = this.base_size;                
            }

    },

    die: function(){
        console.log('i died')
        sim._remove_bug(this)
    },

    simulate: function(){
        this.get_older();
        this.move();
        this.interact();
        this.mood();
        this.reproduce();
        // this.reproduce();
    },

    interact: function(){
        var self = this;
        var all_bugs = this.sim.bugs;
        if (this.juvenile) {return};
        for (var i = all_bugs.length - 1; i >= 0; i--){
            
            var other  = all_bugs[i]
            if (other == self) {continue}

            if (self.can_touch(other)){
                self.touch(other);
            }

            if (self.can_see(other)){
                self.see(other);
            }            

            if (self.can_smell(other)){
                self.smell(other);
            }            

        };
        

    },
    same_sex: function(other){
        return (this.sex === other.sex);
    },

    opposite_sex: function(other){
        return !this.same_sex(other);
    },
    
    too_close: function(other){
       if (this.dist_from(other) < this.standoff_distance){
           return true;
       }  else {
           return false;
       }
    },
    touch: function(other){
        // if (this.same_sex(other)){
        //     this.anger_level = this.anger_timeout;    
        // } else {
            this.mate(other);
            this.anger_level = this.anger_timeout;
        // }
    },

    see: function(other){
        
        
        if ((this.anger_level > 0) && this.too_close(other)){
            this.turn_away(other);
            return            
        } 
        if (this.fertile && other.fertile)  {
                this.turn_towards(other);                    
        } 
    },

    smell: function(other){
        if (other.fertile && (other.sex == 'female') && (self.sex == 'male'))  {
                this.turn_towards(other);                    
        } 
    },
    

    turn_towards: function(other){
        var dx = this.x-other.x;
        var dy = this.y-other.y;
        if (dx > 0){ this.vel_x--}
        if (dx < 0){ this.vel_x++}
        if (dy > 0){ this.vel_y--}
        if (dy < 0){ this.vel_y++}        
    }, 

    turn_away: function(other){
        var dx = this.x-other.x;
        var dy = this.y-other.y;
        if (dx > 0){ this.vel_x++ }
        if (dx < 0){ this.vel_x--}
        if (dy > 0){ this.vel_y++}
        if (dy < 0){ this.vel_y--}        
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
    },
    can_smell: function(other){
        var dist  = this.dist_from(other);

        var sniffable = (dist < this.stink)
        return sniffable
    }
    
}