# DIVA Vis experimental application

This application prototypes several Candela components to carry out
visualization for the DIVA project.

## Build Instructions

To build this application, perform the following steps:

1. **Prepare the data.** Go to the `data` directory from the top-level of this
   repo. Run the `ingest.py` script there on an input file and capture the
   output in a file named `diva.json`. Move or copy this file to the `vis`
   subdirectory of the top-level.

2. **Install the dependencies.** Move into the `vis` directory and say `npm
   install`.

3. **Build the application.** Say `npm run build`. If you want to run it in
   watch mode (so that the application automatically rebuilds upon any change in
   the source code), it's `npm run build -- --watch`.

4. **Serve the application.** Say `npm start` and look at the output to see
   which port the application is being served on. Generally speaking, it will be
   http://localhost:8080, but the server will look for a free port if 8080 is
   occupied.
