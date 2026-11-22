#!/usr/bin/env bash
# Runs GEV baseline commands in gev/, logs each to ops/logs/baseline/, writes summary.tsv. Never edits gev/ sources.
cd "$(dirname "$0")/../gev" || exit 1
L=../ops/logs/baseline; mkdir -p $L; : > $L/summary.tsv
run(){ n=$1; shift; echo "== $n: $*"; "$@" > $L/$n.log 2>&1; c=$?; printf '%s\t%s\t%s\n' "$n" "$c" "$*" >> $L/summary.tsv; echo "exit $c"; }
run 01-npm-ci npm ci
run 02-format-check npm run format:check
run 03-check-boundaries npm run check:boundaries
run 04-test npm test
run 05-build npm run build
run 06-qa-stub-boot npm run qa:stub-boot
run 07-qa-conformance npm run qa:conformance
run 08-qa-stories npm run qa:stories
run 09-test-perf npm run test:perf
printf 'immutability\t-\tstatus=[%s] head=%s\n' "$(git status --porcelain)" "$(git rev-parse HEAD)" >> $L/summary.tsv
echo DONE >> $L/summary.tsv
