---
layout: post
title: "How much of npm can you break?"
---

## Story

The `left-pad` module was removed from npm on the 22nd of March 2016 and, some
hours later, restored. In this small time window many packages such as Babel
could not be installed anymore due to their dependencies on this module.

This event surfaced a vast issue in the nodejs ecosystem: the over-reliance on
external code. Introducing an external dependency may introduce vulnerabilities
and weaken the robustness of your application, so be cautious.

## The website

[This website](http://howmuchofnpmcanyoubreak.tk/) was made to make people realize how many popular packages depend
on smaller ones which could be easily compromised, therefore infecting a large
segment of the ecosystem. There is no reason for over 40k packages to depend on
an [8 line package](https://github.com/jonschlinkert/is-number/blob/master/index.js).

## How I made it

The idea was simple, choose a package and recursively traverse npm to find all
of the packages that depend upon it, after all the npm website offers a 'Dependents'
tab on a package's page. I had not anticipated the issues that made this an interesting
technical problem.

### The first version (Typescript)

It took me some time but after reading the CouchDB docs and analyzing [skimdb.npmjs.com](https://skimdb.npmjs.com/)
I found the endpoint I needed: `https://skimdb.npmjs.com/registry/_design/app/_view/dependedUpon?startkey=["is-odd"]&endkey=["is-odd",{}]&reduce=false`

This url will return a JSON file which lists all of the packages that depend upon `is-odd`.

With this information I wrote [the first version](https://gist.github.com/mrandri19/90819f8abbc9afb05e0b3b1ff41e3d6f):
a pretty straightforward typescript crawler, which will start from a package,
download all of its dependents and then recursively download their dependents
until it gets to a package that nobody depends upon. This is where the fist
issue surfaced: circular dependencies.

This was quite easily resolved by adding a list of packages which have been
downloaded already and, every time the recursive function `get_dependents(package_name)` is
called, the presence of `package_name` in the list is checked. If a package is
in the list it means that we have already downloaded it so there is no reason to
download it and its dependents again. It is a sort of memoization.

Unfortunately this approach did not work for any decently sized package:
after over 30k requests and 5 minutes of waiting I could not count the
packages dependent on `is-odd`. Making an http request for each package
was way too slow.

### The second version (C++)

While analyzing the npm registry I found that if `startkey` and `endkey` are not set in
`https://skimdb.npmjs.com/registry/_design/app/_view/dependedUpon?startkey=["is-odd"]&endkey=["is-odd",{}]&reduce=false`
 then CouchDB will return **ALL** of the dependecies for all packages.
Downloading the file will give you a 220MB JSON file with everything you need.

This however, while solving the download time issue, created another one: how
do you parse and efficiently traverse a 1.8M line JSON file? [RapidJSON](http://rapidjson.org/) it is.

So I downloaded RapidJSON, and wrote [a C++ program](https://gist.github.com/mrandri19/5263ee93399c724a019fbc62a1d7a0a4)
which was almost a direct translation of the nodejs one, but instead of downloading the packages, it would query the JSON
using rapidJSON's DOM api.

This worked but it was veeery slow, it took about `20.7` seconds to count the dependecies
of `jayson` (197 dependencies, if you were wondering).

#### Removing recursion

My first optimization was removing the recursion: counting the number of unique
dependent packages boils down to a Depth First Search.

{% highlight python %}
tree = Tree()

def dfs(leaf):
    # Process the node
    print(node.value)

    # Recursively traverse the tree
    for child in node.children:
        dfs(child)

dfs(tree)

{% endhighlight %}

<span id="backnote1"></span>
This is a recursive implementation of a depth first search but it is not very
efficient, especially on languages without TCO (tail call optimization).[<sup>[1]</sup>](#note1)

To rewrite this without any form of recursion a [stack](https://en.wikipedia.org/wiki/Stack_(abstract_data_type))
is needed and you can rewrite the pseudocode like this.

{% highlight python %}
tree = Tree()

s = Stack()

s.push(tree)
while not s.isEmpty():
    node = stack.pop()

    # Process the node
    print(node.value)

    # Fill the stack with its children
    for child in node.childer:
        s.push(child)
{% endhighlight %}

Unfortunately this optimization, while precious for later, right now was almost useless:
the average time needed to count the dependencies of `jayson` went from `20.5-21s`
to `20-20.5s`. Almost unnoticeable.

#### Finding the bottleneck

After removing the recursion (which I naively thought was the main performance issue) I
started looking for other problems and ways to speed it up more.

The main issue was that every time we need to get a pacakge's dependencies, all
of the lines in the JSON file need to be scanned to find the dependencies. This
is $$O(n)$$, especially slow if that $$n$$ is around 1.8 Million.

{% highlight c++ %}
vector<string> deps;

int n = 0;

// For each line in the file
for (const auto& row : rows.GetArray()) {
    // Iterate through the "key" array, usually short so no big bottleneck
    for (const auto& key : row["key"].GetArray()) {
        if (key == package_name.c_str() && row["id"] != package_name.c_str()) {
            // Get the dependet package's name
            auto id = row["id"].GetString();

            // Add the packages that depend on `package_name` to a list
            deps.push_back(id);

            // Increment the count of the total dependents
            n++;
        }
    }
}
{% endhighlight %}

For example: to get all of the packages that depend on `is-odd` you need to scan
all of the lines and you will find something like this:

{% highlight json %}
{"id":"3kencoder","key":["is-odd","3kencoder",""],"value":1},
{"id":"a_react_reflux_demo","key":["is-odd","a_react_reflux_demo","this is a demo just"],"value":1},
{"id":"dk_2018_1_1","key":["is-odd","dk_2018_1_1","狙击时刻"],"value":1},
{"id":"is-even","key":["is-odd","is-even","Return true if the given number is even."],"value":1},
{"id":"is-oddnt","key":["is-odd","is-oddnt","Returns true if the given number is oddn't or isn't an integer that does not exceed the JavaScript MAXIMUM_SAFE_INTEGER."],"value":1},
{"id":"miguelcostero-ng2-toasty","key":["is-odd","miguelcostero-ng2-toasty","Angular2 Toasty component shows growl-style alerts and messages for your web app"],"value":1},
{"id":"minimal-handlebars-helpers","key":["is-odd","minimal-handlebars-helpers","minimal handlebars helpers for browser"],"value":1},
{"id":"nanomatch","key":["is-odd","nanomatch","Fast, minimal glob matcher for node.js. Similar to micromatch, minimatch and multimatch, but complete Bash 4.3 wildcard support only (no support for exglobs, posix brackets or braces)"],"value":1},
{"id":"odd","key":["is-odd","odd","Get the odd numbered items from an array."],"value":1},
{"id":"react-native-handcheque-engine","key":["is-odd","react-native-handcheque-engine","## Getting started"],"value":1},
{"id":"react-native-version-manager","key":["is-odd","react-native-version-manager","Get version of application(Gradle) using react-native "],"value":1},
{"id":"react-redux-demo1","key":["is-odd","react-redux-demo1","thi is a demo just"],"value":1},
{"id":"vue-size-tracker","key":["is-odd","vue-size-tracker","Track size of screen, window, element"],"value":1},
{% endhighlight %}

<span id="backnote2"></span>
If this were a database then adding an index on the `key` column would be enough,
but since we are not using one we need to implement the index ourserves.
We will store the data in an `HashMap`.[<sup>[2]</sup>](#note2)

This led to the third and final rewrite of the program. Which language? R U S T
obviously.

### The third and final version (Rust)

In [the Rust version](https://github.com/mrandri19/jenga) the hasmap is built like this:

For each line in the file, get the id of the package and its dependent, then insert
it into the hashmap which maps a package's id to its dependents id.

{% highlight rust %}
type DependeciesMap = HashMap<String, Vec<String>>;

fn create_dependencies_map(dependencies_path: &Path) -> Result<DependeciesMap> {
    // Remeber, I've removed first and last line and then added a comma at the
    // end of the second-last
    let file = File::open(dependencies_path)?;

    let mut dependents: DependeciesMap = HashMap::new();

    for line_opt in BufReader::new(file).lines() {
        let mut line = line_opt?;

        line.pop(); // Remove trailing comma

        let v: Value = serde_json::from_str(&line)?;

        let id = (&v["key"][0]).as_str().unwrap().to_owned();
        let dependent = (&v["id"]).as_str().unwrap().to_owned();

        let deps = dependents.entry(id).or_insert(vec![]);
        (*deps).push(dependent.to_string());
    }

    Ok(dependents)
}
{% endhighlight %}


This map gets created in less than 3 seconds and querying for `lodash`, the
most depended upon package takes less than 150ms.

I've then created using [Rocket](https://rocket.rs) a simple frontend to this
script so that you can try it too. Check it out at [http://howmuchofnpmcanyoubreak.ml/](http://howmuchofnpmcanyoubreak.ml/)

## Notes
<span id="note1"></span>
<a href="#backnote1">1.</a> This function will still need to be rewritten to benefit from TCO, in this form (recursive calls inside a for)
it will not get optimised at all.


<span id="note2"></span>
<a href="#backnote2">2.</a> I believe that when an index is created in a database the data structure behind that is a B-Tree which has
$$O(\log{n})$$ index access.

<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.0/MathJax.js?config=TeX-AMS-MML_HTMLorMML" type="text/javascript"></script>
