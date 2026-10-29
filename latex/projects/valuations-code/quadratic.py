print("This tool is to check if an integer have a square root in p-adic")
p = int(input("Enter the prime for the p-adic:"))
while p < 3 or any(p % q == 0 for q in range(2, int(p**0.5) + 1)):
    p = int(input("p must be an odd prime (for p = 2 this method does not work). Enter p:"))

i = 0
while i < 2:
    a = int(input("Enter a number `a` less than the prime you entered to check it have a square root :"))
    if 0 <= a < p:
        break
s = []
i = 0
while i < p:
    s = s + [i]
    i = i + 1
t = []
i = 0
while i < p:
    t = t + [int(s[i])**2 % p]
    i = i + 1


i = 0
while i < 2:
    if a in t:
        break
    print("The `a` you entered is not a square in `p`-adic")
    a = int(input("Enter another `a`:"))


print("The number you entered", int(a), "have a square root in the", int(p),"-adic")
n = int(input("How many coefficients you want to evaluate?"))

i = 0
while i < p:
    if a == t[i]:
        x0 = i
        break
    i = i+1
y = [x0]
z = x0
j=0
while j<n-1:
    k = 0
    while k<p:
        T = (z**2-a)//p**(j+1)
        S = T + 2*z*k
        if S % p == 0:
            y = y +[k]
            z = z +k * p**(j+1)
            break
        k = k + 1
    j = j + 1
print("The square root of", int(a), "in the ", int(p), "-adic is:")
print(y)
print("The first number is the coefficient of p^0, the second for p^1 and so on...")
print("NOTE: if the `a` you entered is not a square in the integers then its p-adic is infinite!")
End = str(input("Press any key to close the window"))



