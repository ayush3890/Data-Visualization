var m = [];
for(var i = 0; i < array.length; i++) {
    var temp = array[i].country;
    var b = contains(temp);
    var obj = {};
    if (b === null) {
        obj = {
                    name : array[i].country,
                    count:1,
                    art:[]
                };
        obj.art.push(array[i]);
        m.push(obj);
    } else {
        var index = m.indexOf(b);
        m.splice(index, 1);
        obj.name = b.name;
        obj.count = b.count + 1;
        obj.art = b.art;
        obj.art.push(array[i]);
        m.push(obj);
    }

}
function contains(t) {
    for(var i = 0; i < m.length; i++) {
        if(m[i].name === t) {
            return m[i];
        }
    }

    return null;
}

var fmap = m;

var width = 500;
var height = 500;
var padding = 30;

var tooltip = d3.select('body')
    .append('div')
    .classed('tooltip', true);

var maxDate = new Date(array[0].added),
    minDate = new Date(array[array.length-1].added);

var xScale = d3.scaleTime()
    .domain([minDate, maxDate])
    .range([padding, width - padding]);

var yScale = d3.scaleLinear()
    .domain(d3.extent(array, d => d.intensity))
    .range([height - padding, padding]);

var colorScale = d3.scaleLinear()
    .domain(d3.extent(array, d => d.likelihood))
    .range(['orange', 'red']);

var radiusScale = d3.scaleLinear()
    .domain(d3.extent(array, d => d.relevance))
    .range([2,10]);

var xAxis = d3.axisBottom(xScale)
    .tickSize(-height + 2 * padding)
    .tickFormat(d3.timeFormat('%b  %Y'))
    .tickSizeOuter(0);

var yAxis = d3.axisLeft(yScale)
    .tickSize(-height + 2 * padding)
    .tickSizeOuter(0);

updateScatterPlot(array);

function updateScatterPlot(data) {
    d3.select('#sp')
        .append('g')
        .attr('transform', 'translate(0,' + (height - padding)+ ')')
        .call(xAxis);

    d3.select('#sp')
        .append('g')
        .attr('transform', 'translate(28,0)')
        .call(yAxis);

    d3.select('#sp')
        .attr('height', height)
        .attr('width', width)
        .selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(new Date(d.added + '')))
        .attr('cy', d => yScale(d.intensity))
        .attr('fill', d =>colorScale(d.likelihood))
        .attr('r', d => radiusScale(d.relevance))
        .attr('opacity', 0.9)
        .on('mousemove', function(d) {
            tooltip
                .style('opacity', 1)
                .style('left', d3.event.x - (tooltip.node().offsetWidth / 2)+ 'px')
                .style('top', d3.event.y + 25 + "px")
                .html( `
                    <p>${d.insight}</p>
                    <p>Relevance: ${d.relevance}</p>
                    <p>Likelihood: ${d.likelihood}</p>
                    <p>Intensity: ${d.intensity}</p>
                    <p>Added On: ${d.added}</p>

                `);
        })
        .on('mouseout', function() {
            tooltip
                .style('opacity', 0);
        })
        .on('click', d => {
            var arr = [];
            arr.push(d);
            updateShowPage(arr);
        });

    d3.select('svg')
        .append('text')
        .attr('x', width / 2)
        .attr('y', height - padding)
        .attr('dy', '1.5em')
        .attr('text-anchor', 'middle')
        .text('Date');


    d3.select('svg')
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', - height / 2)
        .attr('y', padding)
        .attr('dy', -1.1 + 'em')
        .attr('style', 'middle')
        .text('Intensity');
}



d3.queue()
    .defer(d3.json, '//unpkg.com/world-atlas@1.1.4/world/50m.json')
    .defer(d3.csv, './country_data.csv', function(row) {
        var c = fmap.filter(function( obj ) {
            if(obj.name === row.country) {
                return obj;
            }
        });
        if(c.length === 0) {
            var obj = {};
            obj.name = row.country;
            obj.count = 0;
            c = obj;
        } else {
            c = c[0];
        }
        return {
            country: row.country,
            countryCode: row.countryCode,
            population: +row.population,
            count: c.count,
            articles: c.art
        }
    })
    .await(function(error, mapData, populationData) {
        if (error) throw error;

        var geoData = topojson.feature(mapData, mapData.objects.countries).features;
        populationData.forEach(row => {
            var countries = geoData.filter(d => d.id === row.countryCode);
            countries.forEach(country => country.properties = row);
        });

        var width = 800;
        var height = 600;

        var projection = d3.geoMercator()
                        .scale(125)
                        .translate([width/2, height/1.4]);

        var path = d3.geoPath()
                    .projection(projection);

        d3.select("#map")
            .attr("width", width)
            .attr("height", height)
            .selectAll(".country")
            .data(geoData)
            .enter()
            .append("path")
            .classed("country", true)
            .attr("d", path);

        setColor();

        function setColor() {
            var scale = d3.scaleLinear()
                .domain([0, 112])
                .range(["yellow", "green"]);

            d3.selectAll(".country")
                .transition()
                .duration(750)
                .ease(d3.easeBackIn)
                .attr("fill", d => {
                    var data = d.properties.count;
                    return data ? scale(data) : "#ccc";
                });

            d3.selectAll("#map")
                .on("mousemove", updateTooltip)
                .on('mouseout', function() {
                    tooltip
                        .style('opacity', 0);
                })
                .on('click', updateData);

            function updateTooltip() {
                var tooltip = d3.select(".tooltip");
                var tgt = d3.select(d3.event.target);
                if(tgt._groups[0][0].__data__) {
                    // console.log(tgt._groups[0][0].__data__.properties);
                    tooltip
                        .style('opacity', 1)
                        .style("left", (d3.event.pageX + - 5 - tooltip.node().offsetWidth / 2) + "px")
                        .style("top", (d3.event.pageY + 100 - tooltip.node().offsetHeight - 10) + "px")
                        .html(function() {
                            var string = '<p>Country: ' + tgt._groups[0][0].__data__.properties.country + '</p>';
                            if (tgt._groups[0][0].__data__.properties.articles)
                                string += '<p>Total Number of articles:' + tgt._groups[0][0].__data__.properties.count + '</p>';
                        return string;
                })
                }

            }

            function updateData() {
                var tgt = d3.select(d3.event.target);
                d3.selectAll("#sp > *").remove();
                if(tgt._groups[0][0].__data__) {
                    if(tgt._groups[0][0].__data__.properties.articles)
                        updateScatterPlot(tgt._groups[0][0].__data__.properties.articles);
                    updateShowPage(tgt._groups[0][0].__data__.properties.articles);
                } else {
                    updateScatterPlot(array);
                }
            }
        }
    });

function updateShowPage(articles) {
    d3.selectAll("#showPage > *").remove();

    d3.select('#showPage')
        .attr('width', '1000px')
        .attr('height', '1000px')
        .selectAll('div')
        .data(articles)
        .enter()
        .append('div')
        .html(function(d) {
            var s = ''+
                '<p id="topic">' + d.sector + ' | ' + d.topic + '</p>' +
                '<p>' + d.title +'</p>' +
                '<p>' + d.region + ' | ' + d.country + '</p>' +
                '<a target="_blank" href="' + d.url + '">Read More</a>';
            return s;
        })
        .classed('article', true)
        .style('color', function(d) {
            return colorScale(d.likelihood) + '';
        })
        .on('mousemove', d => {
            var tgt = d3.select(d3.event.target);
        });
}






