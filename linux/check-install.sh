#!/usr/bin/env bash
# Checks the Linux release archive on a machine with systemd, as root: installs
# it, checks the service answers with the archive's version, updates it and
# checks the settings were kept, then uninstalls it. Given an archive from
# before the rename to den-watcher, it first installs that one and checks the
# new archive takes it over with its settings, add-ons and history.
#
#   sudo linux/check-install.sh den-watcher-1.2.3-linux-amd64.tar.gz 1.2.3 [usage-control-2.0.7a-linux-amd64.tar.gz]
set -euo pipefail

archive="$(realpath "$1")"
version="$2"
old_archive="${3:+$(realpath "$3")}"
work="$(mktemp -d)"
docker_check=false

# Removes the test container of the containers add-on and its image, where
# they are.
remove_check() {
  docker rm -f den-watcher-check > /dev/null 2>&1 || true
  docker rmi den-watcher-check > /dev/null 2>&1 || true
}

trap 'if [[ "$docker_check" == true ]]; then remove_check; fi; rm -rf "$work"' EXIT
# A failing step shows what the services logged.
trap 'journalctl -u den-watcher -u den-watcher-power -u den-watcher-pressure -u den-watcher-kernel -u den-watcher-gpu -u den-watcher-inodes -u den-watcher-wifi -u den-watcher-memory -u den-watcher-ports -u den-watcher-smart -u den-watcher-containers -u den-watcher-processes -u den-watcher-bluetooth --no-pager | tail -40 >&2' ERR
tar -xzf "$archive" -C "$work"
folder="$(find "$work" -mindepth 1 -maxdepth 1 -type d)"

# Waits until the service answers at path and prints the answer.
answer() {
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:9393$1" 2> /dev/null; then
      return 0
    fi
    sleep 1
  done
  journalctl -u den-watcher --no-pager | tail -40 >&2
  echo "den-watcher did not answer $1" >&2
  return 1
}

if [[ -n "$old_archive" ]]; then
  old="$work/old"
  mkdir "$old"
  tar -xzf "$old_archive" -C "$old"
  old_folder="$(find "$old" -mindepth 1 -maxdepth 1 -type d)"
  "$old_folder/install.sh" --addons=power < /dev/null
  sed -i 's/^DEVICE_NAME=.*/DEVICE_NAME=Before the rename/' /etc/usage-control.env
  systemctl restart usage-control
  answer /api/devices | grep -q '"name":"Before the rename"' || { echo "the old archive did not take DEVICE_NAME" >&2; exit 1; }
  test -f /var/lib/usage-control/usage-control.db
  # Without --addons and without a terminal, as an unattended update.
  "$folder/install.sh" < /dev/null
  answer /api/metrics | grep -q "\"version\":\"$version\"" || { echo "the service does not report version $version after the move" >&2; exit 1; }
  answer /api/devices | grep -q '"name":"Before the rename"' || { echo "the move lost DEVICE_NAME" >&2; exit 1; }
  test -f /var/lib/den-watcher/usage-control.db || { echo "the move lost the history" >&2; exit 1; }
  systemctl is-active --quiet den-watcher-power || { echo "the move lost the power add-on" >&2; exit 1; }
  if systemctl cat usage-control > /dev/null 2>&1 || systemctl cat usage-control-power > /dev/null 2>&1 ||
    compgen -G '/usr/local/bin/usage-control*' > /dev/null || [[ -e /etc/usage-control.env || -e /var/lib/usage-control || -e /var/lib/private/usage-control ]]; then
    echo "the move left usage-control behind" >&2
    exit 1
  fi
  sed -i 's/^DEVICE_NAME=.*/DEVICE_NAME=/' /etc/den-watcher.env
  "$folder/install.sh" --addons= < /dev/null
fi

"$folder/install.sh"
answer /api/metrics | grep -q "\"version\":\"$version\"" || { echo "the service does not report version $version" >&2; exit 1; }
systemctl is-enabled --quiet den-watcher

# An update keeps the settings and the history.
sed -i 's/^DEVICE_NAME=.*/DEVICE_NAME=Install check/' /etc/den-watcher.env
"$folder/install.sh"
answer /api/devices | grep -q '"name":"Install check"' || { echo "the update lost DEVICE_NAME" >&2; exit 1; }
test -f /var/lib/den-watcher/usage-control.db

# The power add-on runs as a service of its own and writes to the add-on
# folder; an update without --addons keeps it.
"$folder/install.sh" --addons=power
systemctl is-active --quiet den-watcher-power || { journalctl -u den-watcher-power --no-pager | tail -20 >&2; echo "the power add-on is not running" >&2; exit 1; }
for _ in $(seq 1 10); do
  [[ -f /run/den-watcher-addons/power.json ]] && break
  sleep 1
done
test -f /run/den-watcher-addons/power.json || { echo "the power add-on wrote no report" >&2; exit 1; }

# The containers add-on reports a running container by its name, which it
# reads from Docker's settings, where the runner has Docker.
"$folder/install.sh" --addons=power,containers
systemctl is-active --quiet den-watcher-containers || { journalctl -u den-watcher-containers --no-pager | tail -20 >&2; echo "the containers add-on is not running" >&2; exit 1; }
# It takes DOCKER_DIR from the settings file, like den-watcher.
systemctl show -p EnvironmentFiles den-watcher-containers | grep -q /etc/den-watcher.env || { echo "the containers add-on does not read /etc/den-watcher.env" >&2; exit 1; }
if command -v docker > /dev/null && docker info > /dev/null 2>&1 && [[ -f /sys/fs/cgroup/cgroup.controllers ]]; then
  # A container of den-watcher itself, from the archive, so nothing is
  # pulled from a registry.
  # The container and image go also when a step fails; one left by an
  # earlier run that stopped halfway goes first, so the name is free.
  docker_check=true
  remove_check
  tar -C "$folder" -c den-watcher | docker import --change 'ENTRYPOINT ["/den-watcher"]' - den-watcher-check > /dev/null
  # Without --rm, so a container that exited early is still there to show.
  docker run -d --name den-watcher-check --network none -e UPDATE_CHECK=false den-watcher-check > /dev/null
  # Kept before the container goes: a report written after that no longer
  # has it.
  reported=false
  for _ in $(seq 1 30); do
    if grep -q '"label":"den-watcher-check"' /run/den-watcher-addons/containers.json 2> /dev/null; then
      reported=true
      break
    fi
    sleep 1
  done
  if [[ "$reported" != true ]]; then
    # What the add-on had to go on, shown before the container goes.
    {
      echo "--- the container"
      docker ps -a --no-trunc --filter name=den-watcher-check || true
      docker inspect -f 'id={{.Id}} status={{.State.Status}} exit={{.State.ExitCode}} pid={{.State.Pid}}' den-watcher-check || true
      docker logs --tail 20 den-watcher-check 2>&1 || true
      pid="$(docker inspect -f '{{.State.Pid}}' den-watcher-check 2> /dev/null || true)"
      if [[ -n "$pid" && "$pid" != 0 ]]; then
        echo "--- its cgroup"
        cat "/proc/$pid/cgroup" || true
      fi
      echo "--- Docker"
      docker info -f 'DockerRootDir={{.DockerRootDir}} CgroupDriver={{.CgroupDriver}} CgroupVersion={{.CgroupVersion}}' || true
      echo "--- containers.json"
      cat /run/den-watcher-addons/containers.json || true
      echo
      echo "--- the containers add-on"
      systemctl status --no-pager den-watcher-containers || true
      journalctl -u den-watcher-containers --no-pager | tail -20 || true
    } >&2
  fi
  docker rm -f den-watcher-check > /dev/null
  docker rmi den-watcher-check > /dev/null
  docker_check=false
  [[ "$reported" == true ]] || { echo "the containers add-on did not report the running container" >&2; exit 1; }
else
  for _ in $(seq 1 10); do
    [[ -f /run/den-watcher-addons/containers.json ]] && break
    sleep 1
  done
  test -f /run/den-watcher-addons/containers.json || { echo "the containers add-on wrote no report" >&2; exit 1; }
fi
"$folder/install.sh" < /dev/null
systemctl is-active --quiet den-watcher-power || { echo "the update removed the power add-on" >&2; exit 1; }
systemctl is-active --quiet den-watcher-containers || { echo "the update removed the containers add-on" >&2; exit 1; }
answer /api/metrics > /dev/null
# The pressure add-on reads /proc/pressure, which a kernel without pressure
# stall information lacks; it then runs but reports nothing. The kernel add-on
# reads /proc, which every runner has. The Wi-Fi add-on runs too; a runner
# without Wi-Fi gets a report without values. The ports add-on reads the
# host's socket tables, which every runner has. The Bluetooth add-on runs
# too; a runner without Bluetooth gets a report without values, through the
# link to the folder its throwaway user writes to. All seven add-ons are
# installed, so --addons= below has to remove them all.
"$folder/install.sh" --addons=power,pressure,kernel,wifi,ports,containers,bluetooth
systemctl is-active --quiet den-watcher-pressure || { journalctl -u den-watcher-pressure --no-pager | tail -20 >&2; echo "the pressure add-on is not running" >&2; exit 1; }
if [[ -f /proc/pressure/cpu ]]; then
  for _ in $(seq 1 10); do
    grep -qs '"cpu-some"' /run/den-watcher-addons/pressure.json && break
    sleep 1
  done
  grep -qs '"cpu-some"' /run/den-watcher-addons/pressure.json || { echo "the pressure add-on reported no CPU pressure" >&2; exit 1; }
fi
systemctl is-active --quiet den-watcher-kernel || { journalctl -u den-watcher-kernel --no-pager | tail -20 >&2; echo "the kernel add-on is not running" >&2; exit 1; }
for _ in $(seq 1 10); do
  grep -qs '"tcp-established"' /run/den-watcher-addons/kernel.json && break
  sleep 1
done
grep -qs '"tcp-established"' /run/den-watcher-addons/kernel.json || { echo "the kernel add-on wrote no report" >&2; exit 1; }
systemctl is-active --quiet den-watcher-wifi || { journalctl -u den-watcher-wifi --no-pager | tail -20 >&2; echo "the Wi-Fi add-on is not running" >&2; exit 1; }
for _ in $(seq 1 10); do
  [[ -f /run/den-watcher-addons/wifi.json ]] && break
  sleep 1
done
test -f /run/den-watcher-addons/wifi.json || { echo "the Wi-Fi add-on wrote no report" >&2; exit 1; }
systemctl is-active --quiet den-watcher-ports || { journalctl -u den-watcher-ports --no-pager | tail -20 >&2; echo "the ports add-on is not running" >&2; exit 1; }
for _ in $(seq 1 10); do
  grep -qs '"id":"ports"' /run/den-watcher-addons/ports.json && break
  sleep 1
done
grep -qs '"id":"ports"' /run/den-watcher-addons/ports.json || { echo "the ports add-on wrote no ports" >&2; exit 1; }
systemctl is-active --quiet den-watcher-bluetooth || { journalctl -u den-watcher-bluetooth --no-pager | tail -20 >&2; echo "the Bluetooth add-on is not running" >&2; exit 1; }
for _ in $(seq 1 10); do
  grep -qs '"extras"' /run/den-watcher-addons/bluetooth.json && break
  sleep 1
done
grep -qs '"extras"' /run/den-watcher-addons/bluetooth.json || { echo "the Bluetooth add-on wrote no report" >&2; exit 1; }
"$folder/install.sh" --addons=
if systemctl cat den-watcher-power > /dev/null 2>&1 || [[ -e /usr/local/bin/den-watcher-power ]]; then
  echo "--addons= left the power add-on behind" >&2
  exit 1
fi
if systemctl cat den-watcher-pressure > /dev/null 2>&1 || [[ -e /usr/local/bin/den-watcher-pressure ]]; then
  echo "--addons= left the pressure add-on behind" >&2
  exit 1
fi
if systemctl cat den-watcher-kernel > /dev/null 2>&1 || [[ -e /usr/local/bin/den-watcher-kernel ]]; then
  echo "--addons= left the kernel add-on behind" >&2
  exit 1
fi
if systemctl cat den-watcher-wifi > /dev/null 2>&1 || [[ -e /usr/local/bin/den-watcher-wifi ]]; then
  echo "--addons= left the Wi-Fi add-on behind" >&2
  exit 1
fi
if systemctl cat den-watcher-ports > /dev/null 2>&1 || [[ -e /usr/local/bin/den-watcher-ports ]]; then
  echo "--addons= left the ports add-on behind" >&2
  exit 1
fi
if systemctl cat den-watcher-containers > /dev/null 2>&1 || [[ -e /usr/local/bin/den-watcher-containers ]]; then
  echo "--addons= left the containers add-on behind" >&2
  exit 1
fi
if systemctl cat den-watcher-bluetooth > /dev/null 2>&1 || [[ -e /usr/local/bin/den-watcher-bluetooth || -L /run/den-watcher-addons/bluetooth.json ]]; then
  echo "--addons= left the Bluetooth add-on behind" >&2
  exit 1
fi

# --addons=cub installs the Cub edition: the lightweight add-ons, and only those.
"$folder/install.sh" --addons=cub
for addon in kernel memory pressure wifi inodes; do
  systemctl is-enabled --quiet "den-watcher-$addon" || { echo "--addons=cub did not install the $addon add-on" >&2; exit 1; }
done
for addon in power gpu processes ports smart containers bluetooth; do
  if systemctl cat "den-watcher-$addon" > /dev/null 2>&1; then
    echo "--addons=cub installed the $addon add-on" >&2
    exit 1
  fi
done
"$folder/install.sh" --addons=

# The gpu add-on runs without an NVIDIA GPU too, and then reports nothing.
"$folder/install.sh" --addons=gpu
systemctl is-active --quiet den-watcher-gpu || { journalctl -u den-watcher-gpu --no-pager | tail -20 >&2; echo "the gpu add-on is not running" >&2; exit 1; }
for _ in $(seq 1 10); do
  [[ -f /run/den-watcher-addons/gpu.json ]] && break
  sleep 1
done
test -f /run/den-watcher-addons/gpu.json || { echo "the gpu add-on wrote no report" >&2; exit 1; }
"$folder/install.sh" --addons=
if systemctl cat den-watcher-gpu > /dev/null 2>&1 || [[ -e /usr/local/bin/den-watcher-gpu ]]; then
  echo "--addons= left the gpu add-on behind" >&2
  exit 1
fi

# The smart add-on runs and writes its report also where no disk answers
# SMART commands, as on a CI machine's virtual disks.
"$folder/install.sh" --addons=smart
systemctl is-active --quiet den-watcher-smart || { journalctl -u den-watcher-smart --no-pager | tail -20 >&2; echo "the smart add-on is not running" >&2; exit 1; }
for _ in $(seq 1 10); do
  [[ -f /run/den-watcher-addons/smart.json ]] && break
  sleep 1
done
test -f /run/den-watcher-addons/smart.json || { echo "the smart add-on wrote no report" >&2; exit 1; }
"$folder/install.sh" --addons=power
if systemctl cat den-watcher-smart > /dev/null 2>&1 || [[ -e /usr/local/bin/den-watcher-smart ]]; then
  echo "--addons=power left the smart add-on behind" >&2
  exit 1
fi

# The inodes add-on runs next to them and reports at least the root
# filesystem; the power add-on stays installed. The memory add-on runs next
# to them too, all writing to the shared add-on folder, and the processes
# add-on lists the busiest processes, the CPU ones from its second read on.
# The kernel, memory and processes add-ons stay for the uninstall to remove.
"$folder/install.sh" --addons=power,inodes,kernel,memory,processes
systemctl is-active --quiet den-watcher-inodes || { journalctl -u den-watcher-inodes --no-pager | tail -20 >&2; echo "the inodes add-on is not running" >&2; exit 1; }
# It takes DOCKER_DIR from the settings file, but not ADDONS_DIR.
systemctl show -p EnvironmentFiles den-watcher-inodes | grep -q /etc/den-watcher.env || { echo "the inodes add-on does not read /etc/den-watcher.env" >&2; exit 1; }
systemctl show -p UnsetEnvironment den-watcher-inodes | grep -q ADDONS_DIR || { echo "the inodes add-on does not unset ADDONS_DIR" >&2; exit 1; }
for _ in $(seq 1 10); do
  grep -qs '"label":"/"' /run/den-watcher-addons/inodes.json && break
  sleep 1
done
grep -qs '"label":"/"' /run/den-watcher-addons/inodes.json || { echo "the inodes add-on reported no root filesystem" >&2; exit 1; }
systemctl is-active --quiet den-watcher-power || { echo "adding the inodes add-on stopped the power add-on" >&2; exit 1; }
systemctl is-active --quiet den-watcher-memory || { journalctl -u den-watcher-memory --no-pager | tail -20 >&2; echo "the memory add-on is not running" >&2; exit 1; }
for _ in $(seq 1 10); do
  grep -q '"id":"committed"' /run/den-watcher-addons/memory.json 2> /dev/null && break
  sleep 1
done
grep -q '"id":"committed"' /run/den-watcher-addons/memory.json || { echo "the memory add-on wrote no report" >&2; exit 1; }
systemctl is-active --quiet den-watcher-processes || { journalctl -u den-watcher-processes --no-pager | tail -20 >&2; echo "the processes add-on is not running" >&2; exit 1; }
for _ in $(seq 1 15); do
  grep -qs '"id":"processes-cpu"' /run/den-watcher-addons/processes.json && break
  sleep 1
done
grep -q '"id":"processes-memory"' /run/den-watcher-addons/processes.json || { echo "the processes add-on reported no processes by memory" >&2; exit 1; }
grep -q '"id":"processes-cpu"' /run/den-watcher-addons/processes.json || { echo "the processes add-on reported no processes by CPU" >&2; exit 1; }
# Once power has written its report, it must be able to write it again.
for _ in $(seq 1 10); do
  [[ -f /run/den-watcher-addons/power.json ]] && break
  sleep 1
done
rm /run/den-watcher-addons/power.json
for _ in $(seq 1 10); do
  [[ -f /run/den-watcher-addons/power.json ]] && break
  sleep 1
done
test -f /run/den-watcher-addons/power.json || { echo "the power add-on can no longer write next to the other add-ons" >&2; exit 1; }

# --purge also deletes settings made with systemctl edit.
mkdir -p /etc/systemd/system/den-watcher-power.service.d
printf '[Service]\nEnvironment=CHECK=1\n' > /etc/systemd/system/den-watcher-power.service.d/override.conf
"$folder/install.sh" --uninstall --purge
if systemctl cat den-watcher > /dev/null 2>&1 || systemctl cat den-watcher-power > /dev/null 2>&1 ||
  systemctl cat den-watcher-inodes > /dev/null 2>&1 || systemctl cat den-watcher-kernel > /dev/null 2>&1 ||
  systemctl cat den-watcher-memory > /dev/null 2>&1 || systemctl cat den-watcher-processes > /dev/null 2>&1 ||
  [[ -e /usr/local/bin/den-watcher || -e /usr/local/bin/den-watcher-power || -e /usr/local/bin/den-watcher-inodes ||
  -e /usr/local/bin/den-watcher-kernel || -e /usr/local/bin/den-watcher-memory ||
  -e /usr/local/bin/den-watcher-processes || -e /etc/den-watcher.env ||
  -e /etc/systemd/system/den-watcher-power.service.d ]]; then
  echo "the uninstall left den-watcher behind" >&2
  exit 1
fi
echo "Install, update, the power, pressure, kernel, Wi-Fi, ports, containers, gpu, smart, inodes, memory and processes add-ons and uninstall work."
