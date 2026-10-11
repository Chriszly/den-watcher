package reach

import "encoding/binary"

// The ICMP types of a ping (RFC 792).
const (
	icmpEchoReply   = 0
	icmpEchoRequest = 8
)

// echoRequest returns an ICMP echo request with the sequence number and a
// checksum. The identifier is left 0: a datagram socket sets its own.
func echoRequest(sequence uint16) []byte {
	message := make([]byte, 16)
	message[0] = icmpEchoRequest
	binary.BigEndian.PutUint16(message[6:], sequence)
	copy(message[8:], "denwatch")
	binary.BigEndian.PutUint16(message[2:], checksum(message))
	return message
}

// isEchoReply reports whether packet is the echo reply to sequence. macOS
// passes the IPv4 header with it, Linux does not.
func isEchoReply(packet []byte, sequence uint16) bool {
	if len(packet) >= 20 && packet[0]>>4 == 4 {
		headerLength := int(packet[0]&0x0f) * 4
		if len(packet) < headerLength {
			return false
		}
		packet = packet[headerLength:]
	}
	return len(packet) >= 8 && packet[0] == icmpEchoReply && binary.BigEndian.Uint16(packet[6:]) == sequence
}

// checksum is the Internet checksum of message (RFC 1071).
func checksum(message []byte) uint16 {
	var sum uint32
	for i := 0; i+1 < len(message); i += 2 {
		sum += uint32(binary.BigEndian.Uint16(message[i:]))
	}
	if len(message)%2 == 1 {
		sum += uint32(message[len(message)-1]) << 8
	}
	for sum>>16 != 0 {
		sum = sum&0xffff + sum>>16
	}
	return ^uint16(sum)
}
